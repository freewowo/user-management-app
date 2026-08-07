export interface User {
  id: number
  userName: string
  phone: string
  email?: string
  gender?: '男' | '女' | '未知'
  idCard?: string
  address?: string
  source?: string
  remark?: string
  createdAt: string
  updatedAt: string
  [key: string]: any
}

export interface Order {
  id: number
  userId: number
  orderNo: string
  productName: string
  amount: number
  orderTime: string
  expireTime: string
  status: '进行中' | '已到期' | '已完成'
  createdAt: string
  updatedAt: string
  [key: string]: any
}

export interface UserWithOrders extends User {
  orders?: Order[]
}

export interface OrderWithUser extends Order {
  userName?: string
  phone?: string
}

export interface ImportData {
  userName: string
  phone: string
  email?: string
  gender?: string
  idCard?: string
  address?: string
  source?: string
  remark?: string
  productName: string
  amount: number | string
  orderTime: string
  expireTime: string
}

export interface FilterParams {
  keyword?: string
  phone?: string
  orderNo?: string
  status?: string
  startDate?: string
  endDate?: string
  source?: string
  minAmount?: number
  maxAmount?: number
}
