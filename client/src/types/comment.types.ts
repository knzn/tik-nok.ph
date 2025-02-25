export interface Comment {
  id: string
  content: string
  userId: {
    id: string
    username: string
    profilePicture?: string
  }
  createdAt: string
  replies?: Comment[]
  parentId?: string | null
}

export interface ApiComment {
  _id: string
  content: string
  userId: {
    _id: string
    username: string
    profilePicture?: string
  }
  createdAt: string
  replies?: ApiComment[]
  parentId?: string | null
}