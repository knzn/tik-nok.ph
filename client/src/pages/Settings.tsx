import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../components/ui/use-toast'

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Separator } from '../components/ui/separator'
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog'

// Add isPrivate field to User type
interface ProfileSettings {
  isPrivate: boolean;
}

// Password schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Email schema
const emailSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newEmail: z.string().email('Please enter a valid email address'),
})

// Username schema
const usernameSchema = z.object({
  newUsername: z.string().min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_ ]+$/, 'Username can only contain letters, numbers, underscores, and spaces'),
})

// Privacy schema
const privacySchema = z.object({
  profilePrivacy: z.enum(['public', 'private']),
})

export default function SettingsPage() {
  // Static state that doesn't depend on user
  const [activeTab, setActiveTab] = useState('password')
  const [isPasswordChanging, setIsPasswordChanging] = useState(false)
  const [isEmailChanging, setIsEmailChanging] = useState(false)
  const [isUsernameChanging, setIsUsernameChanging] = useState(false)
  const [isPrivacyChanging, setIsPrivacyChanging] = useState(false)
  const [canChangeUsername, setCanChangeUsername] = useState(true)
  const [lastUsernameChange, setLastUsernameChange] = useState<Date | null>(null)
  const [showUsernameChangeDialog, setShowUsernameChangeDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const authCheckCompleted = useRef(false)
  
  // Get auth from store
  const { user, updateUser, checkAuth, isAuthenticated } = useAuthStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  
  // Form management - with static default values
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      currentPassword: '',
      newEmail: '',
    },
  })

  const usernameForm = useForm<z.infer<typeof usernameSchema>>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      newUsername: '',
    },
  })

  const privacyForm = useForm<z.infer<typeof privacySchema>>({
    resolver: zodResolver(privacySchema),
    defaultValues: {
      profilePrivacy: 'public',
    },
  })

  // Try to initialize auth when component mounts - but only once
  useEffect(() => {
    // Skip if we've already completed an auth check
    if (authCheckCompleted.current) return;
    
    // Function to handle auth initialization
    const initializeAuth = async () => {
      try {
        console.log('Settings: Starting auth check');
        // First, check if we already have a user or token
        if (user) {
          console.log('Settings: User already exists, skipping auth check');
          
          // Check if username in localStorage is different from user object
          // This helps recover from a username change that might have lost auth state
          const storedUsername = localStorage.getItem('user_username');
          if (storedUsername && storedUsername !== user.username) {
            console.log('Detecting username mismatch, synchronizing with localStorage');
            try {
              await updateUser({
                ...user,
                username: storedUsername
              });
            } catch (updateError) {
              console.error('Failed to sync username:', updateError);
            }
          }
          
          setIsLoading(false);
          authCheckCompleted.current = true;
          return;
        }
        
        // Try to refresh auth state if needed
        console.log('Settings: No user, trying checkAuth()');
        await checkAuth();
        
        // Set a longer timeout (30 seconds) to prevent premature redirects
        const timeoutId = setTimeout(() => {
          console.log('Settings: Auth timeout reached');
          // Only redirect if still not authenticated after timeout
          if (!isAuthenticated && !user) {
            console.log('Settings: Still not authenticated after timeout, redirecting');
            setIsLoading(false);
            navigate('/login', { 
              replace: true,
              state: { from: '/settings', message: 'Please log in to access settings' }
            });
          } else {
            setIsLoading(false);
          }
          
          authCheckCompleted.current = true;
        }, 30000); // 30 seconds
        
        return () => {
          clearTimeout(timeoutId);
        };
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setIsLoading(false);
        authCheckCompleted.current = true;
      }
    };
    
    initializeAuth();
  }, [user, checkAuth, navigate, isAuthenticated, updateUser]);

  // Initialize forms when user data is available
  useEffect(() => {
    // If we have a user, we can initialize forms and stop loading
    if (user) {
      console.log('Settings: User detected, initializing forms', user.username);
      
      // Update form values
      emailForm.setValue('newEmail', user.email || '');
      usernameForm.setValue('newUsername', user.username || '');
      privacyForm.setValue('profilePrivacy', user.isPrivate ? 'private' : 'public');
      
      // Check username change eligibility
      const lastChange = localStorage.getItem('lastUsernameChange');
      if (lastChange) {
        const changeDate = new Date(lastChange);
        const today = new Date();
        
        // Calculate if it's been at least 30 days
        const timeDiff = today.getTime() - changeDate.getTime();
        const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
        setCanChangeUsername(dayDiff >= 30);
        setLastUsernameChange(changeDate);
      }
      
      // Mark loading as complete when user data is available
      setIsLoading(false);
      authCheckCompleted.current = true;
    }
  }, [user]); 

  // Form submission handlers
  const onChangePassword = async (data: z.infer<typeof passwordSchema>) => {
    try {
      setIsPasswordChanging(true);
      
      // Check if passwords match
      if (data.newPassword !== data.confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure your new passwords match.",
          variant: "destructive",
        });
        return;
      }
      
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Authentication error",
          description: "You need to be logged in to change your password.",
          variant: "destructive",
        });
        return;
      }
      
      // Call the API endpoint
      const response = await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      });
      
      if (response.data.success) {
        toast({
          title: "Password updated",
          description: "Your password has been updated successfully.",
        });
        passwordForm.reset();
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      console.error("Password change error:", error);
      
      // Handle different error types
      if (error.response?.data?.code === 'INCORRECT_PASSWORD') {
        toast({
          title: "Incorrect password",
          description: "Your current password is incorrect.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to change password. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsPasswordChanging(false);
    }
  };

  const onChangeEmail = async (data: z.infer<typeof emailSchema>) => {
    try {
      setIsEmailChanging(true);
      
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Authentication error",
          description: "You need to be logged in to change your email.",
          variant: "destructive",
        });
        return;
      }
      
      // Call the API endpoint
      const response = await api.post('/auth/change-email', {
        currentPassword: data.currentPassword,
        newEmail: data.newEmail
      });
      
      if (response.data.success) {
        toast({
          title: "Email updated",
          description: "Your email has been updated successfully.",
        });
        
        // Update user in store if available
        if (updateUser && user) {
          updateUser({
            ...user,
            email: data.newEmail
          });
        }
        
        emailForm.reset();
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Email change error:", error);
      
      // Handle different error types
      if (error.response?.data?.code === 'INCORRECT_PASSWORD') {
        toast({
          title: "Incorrect password",
          description: "Your current password is incorrect.",
          variant: "destructive",
        });
      } else if (error.response?.data?.code === 'EMAIL_EXISTS') {
        toast({
          title: "Email already in use",
          description: "This email is already registered to another account.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to change email. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsEmailChanging(false);
    }
  };

  const onChangeUsername = async (data: z.infer<typeof usernameSchema>) => {
    if (!canChangeUsername) {
      setShowUsernameChangeDialog(true)
      return
    }
    
    setIsUsernameChanging(true)
    try {
      if (user) {
        console.log('Starting username update process for user:', user.id);
        
        // Use our new API endpoint for username changes
        const response = await api.post('/auth/change-username', {
          newUsername: data.newUsername
        });
        
        console.log('Username update response:', response);
        
        if (!response.data || !response.data.success) {
          throw new Error('Failed to update username');
        }
        
        // Update the user data in auth store with the response from server
        await updateUser({
          ...user,
          username: response.data.username
        });
        
        // Update localStorage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({
          ...userData,
          username: response.data.username
        }));
        localStorage.setItem('lastUsernameChange', new Date().toISOString());
        
        // Update UI state
        setCanChangeUsername(false);
        setLastUsernameChange(new Date());
        usernameForm.setValue('newUsername', response.data.username);
        
        toast({
          title: "Success",
          description: "Your username has been updated. You can change it again in 30 days.",
        });
        
        // Reload to ensure all components see the changes
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error: any) {
      console.error("Username update error:", error);
      
      // Handle different error types
      if (error.response?.data?.code === 'USERNAME_EXISTS') {
        toast({
          title: "Username already taken",
          description: "This username is already in use by another account.",
          variant: "destructive"
        });
      } else if (error.response?.data?.code === 'INVALID_FORMAT') {
        toast({
          title: "Invalid username format",
          description: "Username can only contain letters, numbers, underscores, and spaces.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to update username. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsUsernameChanging(false);
    }
  }

  const onChangePrivacy = async (data: z.infer<typeof privacySchema>) => {
    setIsPrivacyChanging(true)
    try {
      if (user) {
        console.log('Starting privacy update process for user:', user.id);
        const isPrivate = data.profilePrivacy === 'private';
        
        // Use the same endpoint as the EditProfileModal
        const response = await api.patch('/users/profile', {
          isPrivate: isPrivate,
          // Keep existing profile fields to avoid overwriting them
          gamefarmName: user.gamefarmName || '',
          address: user.address || '',
          contactNumber: user.contactNumber || '',
          facebookProfile: user.facebookProfile || ''
        });
        
        console.log('Privacy update response:', response);
        
        if (!response.data) {
          throw new Error('Failed to update profile');
        }
        
        // Update the user data in auth store with the response from server
        await updateUser({
          ...user,
          ...response.data
        });
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify({
          ...user,
          ...response.data
        }));
        localStorage.setItem('user_privacy', data.profilePrivacy);
        
        toast({
          title: "Success",
          description: `Your profile is now ${data.profilePrivacy}.`,
        });
        
        // Reload to ensure all components see the changes
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error: any) {
      console.error("Privacy update error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update privacy settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPrivacyChanging(false);
    }
  }

  // Show loading spinner only when needed
  if (isLoading) {
    return (
      <div className="container flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="text-center">
          <div className="w-10 h-10 border-t-4 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Account Settings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="username">Username</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>
        
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={isPasswordChanging}>
                    {isPasswordChanging ? "Updating..." : "Change Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Change Email</CardTitle>
              <CardDescription>
                Update your email address. You'll need to verify your new email address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onChangeEmail)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={emailForm.control}
                    name="newEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your new email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={isEmailChanging}>
                    {isEmailChanging ? "Updating..." : "Change Email"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="username">
          <Card>
            <CardHeader>
              <CardTitle>Change Username</CardTitle>
              <CardDescription>
                Update your username. You can only change it once every 30 days.
              </CardDescription>
              {lastUsernameChange && !canChangeUsername && (
                <p className="text-sm text-yellow-600 mt-2">
                  Last changed: {new Date(lastUsernameChange).toLocaleDateString()}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <Form {...usernameForm}>
                <form onSubmit={usernameForm.handleSubmit(onChangeUsername)} className="space-y-4">
                  <FormField
                    control={usernameForm.control}
                    name="newUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your new username" 
                            {...field} 
                            disabled={!canChangeUsername}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    disabled={isUsernameChanging || !canChangeUsername}
                  >
                    {isUsernameChanging ? "Updating..." : "Change Username"}
                  </Button>
                  
                  {!canChangeUsername && (
                    <p className="text-sm text-muted-foreground">
                      You can change your username again in 30 days from your last change.
                    </p>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control who can see your profile and content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...privacyForm}>
                <form onSubmit={privacyForm.handleSubmit(onChangePrivacy)} className="space-y-4">
                  <FormField
                    control={privacyForm.control}
                    name="profilePrivacy"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Profile Visibility</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="public" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Public - Anyone can view your profile and content
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="private" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Private - Only approved followers can view your profile and content
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={isPrivacyChanging}>
                    {isPrivacyChanging ? "Updating..." : "Save Privacy Settings"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Username change dialog */}
      <AlertDialog open={showUsernameChangeDialog} onOpenChange={setShowUsernameChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Username Change Limit</AlertDialogTitle>
            <AlertDialogDescription>
              You can only change your username once every 30 days. You last changed it on{" "}
              {lastUsernameChange ? new Date(lastUsernameChange).toLocaleDateString() : "N/A"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 