import { EyeOffIcon } from 'lucide-react'
import { Alert, AlertDescription } from '../../ui/alert'

export function UnlistedVideoBanner() {
  return (
    <Alert className="mb-4 bg-yellow-50 border-yellow-200">
      <EyeOffIcon className="h-4 w-4 text-yellow-500 mr-2" />
      <AlertDescription className="text-yellow-700">
        This video is unlisted. It won't appear in home, trending, or visitor profile pages, but anyone with the link can view it.
      </AlertDescription>
    </Alert>
  )
} 