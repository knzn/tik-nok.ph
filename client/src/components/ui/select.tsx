import * as React from "react"
import { cn } from "../../lib/utils"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
}

const Select: React.FC<React.PropsWithChildren<SelectProps>> = ({ 
  children, 
  value, 
  onValueChange, 
  placeholder,
  className,
  ...props 
}) => {
  return (
    <select 
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  )
}

const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => {
  return <option value={value}>{children}</option>
}

// Create empty components so imports don't break
const SelectTrigger = ({ children }: React.PropsWithChildren) => <>{children}</>
const SelectContent = ({ children }: React.PropsWithChildren) => <>{children}</>
const SelectValue = ({ children }: React.PropsWithChildren) => <>{children}</>

export {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} 