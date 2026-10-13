import { useQuery } from '@tanstack/react-query'
import {
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
} from 'expo-router'
import { Alert } from 'react-native'
import { type RouterOutputs, trpc } from '@/utils/api'

export type GroupDetail = RouterOutputs['lms']['studyGroup']['get']
export type ActiveGroup = Extract<GroupDetail, { access: 'active' }>

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function useStudyGroup() {
  const local = useLocalSearchParams<{ groupId?: string | string[] }>()
  const global = useGlobalSearchParams<{ groupId?: string | string[] }>()
  const pathname = usePathname()
  const fromPath = pathname.match(/\/friends\/group\/([^/]+)/)?.[1]
  const groupId =
    firstParam(local.groupId) || firstParam(global.groupId) || fromPath

  const query = useQuery(
    trpc.lms.studyGroup.get.queryOptions(
      { groupId: groupId ?? '' },
      { enabled: Boolean(groupId) },
    ),
  )

  return { groupId, query }
}

export function groupAlert(title: string) {
  return (error: { message: string }) => Alert.alert(title, error.message)
}
