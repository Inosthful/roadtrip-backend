import Expense from '#models/expense'
import ExpenseSplit from '#models/expense_split'
import Trip from '#models/trip'
import { createExpenseValidator } from '#validators/expense/create'
import { updateExpenseValidator } from '#validators/expense/update'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export default class ExpensesController {
  /**
   * GET /trips/:tripId/expenses
   * Liste toutes les dépenses d'un voyage
   */
  async index({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const trip = await Trip.findOrFail(params.tripId)

    const hasAccess = await this.checkTripAccess(trip, user.id)

    if (!hasAccess) {
      return response.forbidden({ message: 'Access denied to this trip' })
    }

    // Récupérer toutes les dépenses avec relations
    const expenses = await Expense.query()
      .where('trip_id', params.tripId)
      .preload('payer')
      .preload('stop')
      .orderBy('expense_date', 'desc')

    return response.ok(expenses)
  }

  /**
   * POST /trips/:tripId/expenses
   * Créer une nouvelle dépense
   */
  async store({ auth, request, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const payload = await request.validateUsing(createExpenseValidator)
    const trip = await Trip.findOrFail(params.tripId)
    const hasAccess = await this.checkTripAccess(trip, user.id)
    if (!hasAccess) {
      return response.forbidden({ message: 'Access denied to this trip' })
    }
    const expense = await Expense.create({
      tripId: trip.id,
      stopId: payload.stopId,
      title: payload.title,
      description: payload.description,
      amount: payload.amount,
      category: payload.category,
      paidBy: payload.paidBy || user.id,
      expenseDate: DateTime.fromJSDate(payload.expenseDate),
    })

    // 1. Charger les participants du voyage
    await trip.load('participants')

    // 2. Calculer le montant par personne
    const nbParticipants = trip.participants.length
    const montantParPersonne = expense.amount / nbParticipants

    // 3. Créer un tableau d'objets pour les splits
    const splitsData = trip.participants.map((participant) => {
      return {
        expenseId: expense.id,
        userId: participant.id,
        amount: montantParPersonne,
        isPaid: participant.id === user.id, // true si c'est le payeur, false sinon
      }
    })

    // 4. Créer tous les splits en une seule requête
    await ExpenseSplit.createMany(splitsData)

    await expense.load('payer')
    return response.created(expense)
  }

  /**
   * GET /expenses/:id
   * Récupère une dépense spécifique
   */
  async show({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    const expense = await Expense.query()
      .where('id', params.id)
      .preload('trip')
      .preload('payer')
      .preload('stop')
      .preload('splits', (query) => {
        query.preload('user')
      })
      .firstOrFail()

    // Vérifier l'accès au trip parent
    const hasAccess = await this.checkTripAccess(expense.trip, user.id)

    if (!hasAccess) {
      return response.forbidden({ message: 'Access denied' })
    }

    return response.ok(expense)
  }

  /**
   * PATCH /expenses/:id
   * Met à jour une dépense
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const payload = await request.validateUsing(updateExpenseValidator)

    const expense = await Expense.query().where('id', params.id).preload('trip').firstOrFail()

    // Vérifier l'accès au trip parent
    const hasAccess = await this.checkTripAccess(expense.trip, user.id)

    if (!hasAccess) {
      return response.forbidden({ message: 'Access denied' })
    }

    // Convertir la date si présente
    const updateData = {
      ...payload,
      expenseDate: payload.expenseDate ? DateTime.fromJSDate(payload.expenseDate) : undefined,
    }

    expense.merge(updateData)
    await expense.save()

    return response.ok(expense)
  }

  /**
   * DELETE /expenses/:id
   * Supprime une dépense
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    const expense = await Expense.query().where('id', params.id).preload('trip').firstOrFail()

    // Vérifier l'accès au trip parent
    const hasAccess = await this.checkTripAccess(expense.trip, user.id)

    if (!hasAccess) {
      return response.forbidden({ message: 'Access denied' })
    }

    await expense.delete()

    return response.noContent()
  }

  /**
   * GET /trips/:tripId/balance
   * Calcule la balance financière du voyage (qui doit combien à qui)
   */
  async balance({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const trip = await Trip.findOrFail(params.tripId)

    const hasAccess = await this.checkTripAccess(trip, user.id)
    if (!hasAccess) {
      return response.forbidden({ message: 'Access denied to this trip' })
    }

    // Récupérer toutes les dépenses du voyage avec leurs splits
    const expenses = await Expense.query()
      .where('trip_id', params.tripId)
      .preload('splits', (query) => {
        query.preload('user')
      })

    // 1. Créer un objet pour stocker les balances de chaque participant
    // Clé = userId, Valeur = { userId, fullName, paid, owes, balance }
    const balances: Record<
      number,
      { userId: number; fullName: string; paid: number; owes: number; balance: number }
    > = {}

    // 2. Parcourir toutes les dépenses du voyage
    for (const expense of expenses) {
      // 2a. Ajouter le montant payé par le payeur
      const payerId = expense.paidBy

      // Initialiser le payeur s'il n'existe pas encore dans balances
      if (!balances[payerId]) {
        balances[payerId] = {
          userId: payerId,
          fullName: '', // On va le récupérer via les splits
          paid: 0,
          owes: 0,
          balance: 0,
        }
      }

      // Ajouter le montant total de la dépense au "paid" du payeur
      balances[payerId].paid += expense.amount

      // 2b. Parcourir les splits pour voir qui doit combien
      for (const split of expense.splits) {
        const userId = split.userId

        // Initialiser l'utilisateur s'il n'existe pas encore
        if (!balances[userId]) {
          balances[userId] = {
            userId: userId,
            fullName: split.user.fullName, // Récupérer le nom depuis la relation
            paid: 0,
            owes: 0,
            balance: 0,
          }
        }

        // Si on n'a pas encore le nom du payeur, le récupérer maintenant
        if (userId === payerId && !balances[payerId].fullName) {
          balances[payerId].fullName = split.user.fullName
        }

        // Ajouter le montant dû par cet utilisateur
        balances[userId].owes += split.amount
      }
    }

    // 3. Calculer la balance finale pour chaque participant
    // Balance = ce qu'on a payé - ce qu'on doit
    for (const userId in balances) {
      balances[userId].balance = balances[userId].paid - balances[userId].owes
    }

    // 4. Transformer l'objet en tableau pour la réponse JSON
    const balancesArray = Object.values(balances)

    return response.ok({
      tripId: trip.id,
      tripTitle: trip.title,
      balances: balancesArray,
    })
  }

  /**
   * Méthode helper pour vérifier l'accès à un trip
   */
  private async checkTripAccess(trip: Trip, userId: number): Promise<boolean> {
    await trip.load('participants')

    const isCreator = trip.creatorId === userId
    const isParticipant = trip.participants.some((p) => p.id === userId)

    return isCreator || isParticipant
  }
}
