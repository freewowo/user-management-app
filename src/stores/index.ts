import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { userApi, orderApi, settingApi } from '@/api'
import type { User, Order, OrderWithUser } from '@/types'

export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([])
  const loading = ref(false)

  const fetchUsers = async (params?: { keyword?: string; source?: string }) => {
    loading.value = true
    try {
      users.value = await userApi.getList(params)
    } finally {
      loading.value = false
    }
  }

  const addUser = async (data: Record<string, any>) => {
    const user = await userApi.create(data)
    users.value.unshift(user)
    return user
  }

  const updateUser = async (id: number, data: Partial<User>) => {
    const user = await userApi.update(id, data)
    const index = users.value.findIndex(u => u.id === id)
    if (index !== -1) {
      users.value[index] = user
    }
    return user
  }

  const deleteUser = async (id: number) => {
    await userApi.delete(id)
    users.value = users.value.filter(u => u.id !== id)
  }

  const getUserById = (id: number) => users.value.find(u => u.id === id)

  const totalUsers = computed(() => users.value.length)

  return {
    users,
    loading,
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    getUserById,
    totalUsers
  }
})

export const useOrderStore = defineStore('order', () => {
  const orders = ref<OrderWithUser[]>([])
  const loading = ref(false)
  const settings = ref({ reminderDays: 3 })

  const fetchOrders = async (params?: {
    keyword?: string
    phone?: string
    orderNo?: string
    status?: string
    startDate?: string
    endDate?: string
    minAmount?: number
    maxAmount?: number
  }) => {
    loading.value = true
    try {
      orders.value = await orderApi.getList(params)
    } finally {
      loading.value = false
    }
  }

  const fetchSettings = async () => {
    settings.value = await settingApi.get()
  }

  const updateSettings = async (reminderDays: number) => {
    settings.value = await settingApi.update(reminderDays)
  }

  const addOrder = async (data: Record<string, any>) => {
    const order = await orderApi.create(data)
    // 重新获取列表以包含用户信息
    await fetchOrders()
    return order
  }

  const updateOrder = async (id: number, data: Partial<Order>) => {
    const order = await orderApi.update(id, data)
    await fetchOrders()
    return order
  }

  const deleteOrder = async (id: number) => {
    await orderApi.delete(id)
    orders.value = orders.value.filter(o => o.id !== id)
  }

  const batchImport = async (ordersData: any[]) => {
    await orderApi.batchImport(ordersData)
    await fetchOrders()
  }

  const getRemainDays = (expireTime: string): number => {
    return dayjs(expireTime).diff(dayjs(), 'day')
  }

  const getExpiringOrders = computed(() => {
    return orders.value.filter(o => {
      if (o.status !== '进行中') return false
      const remainDays = getRemainDays(o.expireTime)
      return remainDays >= 0 && remainDays <= settings.value.reminderDays
    })
  })

  const getStats = computed(() => {
    return {
      totalOrders: orders.value.length,
      ongoingOrders: orders.value.filter(o => o.status === '进行中').length,
      expiredOrders: orders.value.filter(o => o.status === '已到期').length,
      completedOrders: orders.value.filter(o => o.status === '已完成').length,
      expiringOrders: getExpiringOrders.value.length
    }
  })

  return {
    orders,
    loading,
    settings,
    fetchOrders,
    fetchSettings,
    updateSettings,
    addOrder,
    updateOrder,
    deleteOrder,
    batchImport,
    getRemainDays,
    getExpiringOrders,
    getStats
  }
})
