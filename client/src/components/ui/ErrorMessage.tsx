import { AlertTriangle } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'

interface ErrorMessageProps {
  title?: string
  message: string
}

export function ErrorMessage({ title = 'Error', message }: ErrorMessageProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
} 