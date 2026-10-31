import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage, resourcesApi } from '../lib/api.js'

async function fetchCollection(kind) {
  const { data } = await resourcesApi.list(kind)
  return Array.isArray(data.items) ? data.items : []
}

export function useResourceCollection(kind, { enabled = true } = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError('')
    try { setItems(await fetchCollection(kind)) }
    catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally { setLoading(false) }
  }, [enabled, kind])

  useEffect(() => {
    if (!enabled) return undefined
    let current = true
    fetchCollection(kind).then((nextItems) => {
      if (current) setItems(nextItems)
    }).catch((requestError) => {
      if (current) setError(getErrorMessage(requestError))
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [enabled, kind])

  const create = useCallback(async (data, successMessage = 'Saved to your workspace.') => {
    setSaving(true); setError(''); setSuccess('')
    try {
      await resourcesApi.create(kind, data)
      setSuccess(successMessage)
      await refresh()
      return true
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      return false
    } finally { setSaving(false) }
  }, [kind, refresh])

  const update = useCallback(async (item, data, successMessage = 'Your changes were saved.') => {
    setSaving(true); setError(''); setSuccess('')
    try {
      await resourcesApi.update(kind, item._id, data)
      setSuccess(successMessage)
      await refresh()
      return true
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      return false
    } finally { setSaving(false) }
  }, [kind, refresh])

  const remove = useCallback(async (item) => {
    setSaving(true); setError(''); setSuccess('')
    try {
      await resourcesApi.remove(kind, item._id)
      setSuccess('Item deleted.')
      await refresh()
      return true
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      return false
    } finally { setSaving(false) }
  }, [kind, refresh])

  return { items, setItems, loading, saving, error, setError, success, refresh, create, update, remove }
}
