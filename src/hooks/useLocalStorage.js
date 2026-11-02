import { useCallback, useEffect, useRef, useState } from 'react'

import { useEventCallback, useEventListener } from 'hooks'

const IS_SERVER = typeof window === 'undefined'

export function useLocalStorage(
    key,
    initialValue,
    options = {},
) {
    const { initializeWithValue = true } = options
    const initialValueRef = useRef(initialValue)
    initialValueRef.current = initialValue

    const optionsRef = useRef(options)
    optionsRef.current = options

    const serializer = useCallback((value) => {
        if (optionsRef.current?.serializer) {
            return optionsRef.current.serializer(value)
        }
        return JSON.stringify(value)
    }, [])

    const deserializer = useCallback((value) => {
        if (optionsRef.current?.deserializer) {
            return optionsRef.current.deserializer(value)
        }
        if (value === 'undefined') {
            return undefined
        }

        const fallback =
            initialValueRef.current instanceof Function
                ? initialValueRef.current()
                : initialValueRef.current

        try {
            return JSON.parse(value)
        } catch (error) {
            console.error('Error parsing JSON:', error)
            return fallback
        }
    }, [])

    const readValue = useCallback(() => {
        const fallback =
            initialValueRef.current instanceof Function
                ? initialValueRef.current()
                : initialValueRef.current

        if (IS_SERVER) {
            return fallback
        }

        try {
            const raw = window.localStorage.getItem(key)
            return raw ? deserializer(raw) : fallback
        } catch (error) {
            console.warn(`Error reading localStorage key “${key}”:`, error)
            return fallback
        }
    }, [key, deserializer])

    const [storedValue, setStoredValue] = useState(() => {
        if (initializeWithValue) {
            return readValue()
        }
        return initialValueRef.current instanceof Function
            ? initialValueRef.current()
            : initialValueRef.current
    })

    const setValue = useEventCallback((value) => {
        if (IS_SERVER) {
            console.warn(
                `Tried setting localStorage key “${key}” even though environment is not a client`,
            )
        }

        try {
            const newValue = value instanceof Function ? value(readValue()) : value
            window.localStorage.setItem(key, serializer(newValue))
            setStoredValue(newValue)
            window.dispatchEvent(new StorageEvent('local-storage', { key }))
        } catch (error) {
            console.warn(`Error setting localStorage key “${key}”:`, error)
        }
    })

    const removeValue = useEventCallback(() => {
        if (IS_SERVER) {
            console.warn(
                `Tried removing localStorage key “${key}” even though environment is not a client`,
            )
        }

        const fallback =
            initialValueRef.current instanceof Function
                ? initialValueRef.current()
                : initialValueRef.current

        window.localStorage.removeItem(key)
        setStoredValue(fallback)
        window.dispatchEvent(new StorageEvent('local-storage', { key }))
    })

    // Only update storedValue if the key actually changes after initial mount
    const prevKeyRef = useRef(key)
    useEffect(() => {
        if (prevKeyRef.current !== key) {
            prevKeyRef.current = key
            setStoredValue(readValue())
        }
    }, [key, readValue])

    const handleStorageChange = useCallback(
        (event) => {
            if (event.key && event.key !== key) {
                return
            }
            setStoredValue(readValue())
        },
        [key, readValue],
    )

    useEventListener('storage', handleStorageChange)
    useEventListener('local-storage', handleStorageChange)

    return [storedValue, setValue, removeValue]
}
