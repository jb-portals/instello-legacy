import { useUser } from '@clerk/clerk-expo'
import { Image } from 'expo-image'
import { Link, Tabs } from 'expo-router'
import { HouseIcon } from 'phosphor-react-native'
import { TouchableOpacity } from 'react-native'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

export default function HomeLayout() {
  const { user } = useUser()

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',

          headerTitle: () => (
            <Image
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
              source={require('@/assets/images/instello.png')}
              style={{ width: 110, height: 24 }}
            />
          ),

          tabBarIcon: ({ size, focused }) => (
            <Icon
              as={HouseIcon}
              size={size}
              className={cn(focused ? 'text-primary' : 'text-muted-foreground')}
              weight={focused ? 'fill' : 'duotone'}
            />
          ),

          headerRight: () => (
            <Link asChild href={'/profile'}>
              <TouchableOpacity>
                <Avatar
                  alt="User Image"
                  className="border-border mr-4 size-8 border"
                >
                  <AvatarImage source={{ uri: user?.imageUrl }} />
                  <AvatarFallback>
                    <Text className="font-semibold">
                      {user?.firstName?.charAt(0)}
                    </Text>
                  </AvatarFallback>
                </Avatar>
              </TouchableOpacity>
            </Link>
          ),
        }}
      />
    </Tabs>
  )
}
