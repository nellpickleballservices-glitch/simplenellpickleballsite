'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface AddressAutocompleteProps {
  onSelect: (place: { address: string; lat: number; lng: number }) => void
  placeholder?: string
  className?: string
}

export function AddressAutocomplete({
  onSelect,
  placeholder = 'Search address...',
  className = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Load the Google Maps script once
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return

    // Already loaded
    if (window.google?.maps?.places) {
      setLoaded(true)
      return
    }

    // Check if script tag already exists
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      let attempts = 0
      const check = setInterval(() => {
        attempts++
        if (window.google?.maps?.places) {
          setLoaded(true)
          clearInterval(check)
        } else if (attempts >= 50) {
          clearInterval(check)
        }
      }, 100)
      return () => clearInterval(check)
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = () => setLoaded(true)
    document.head.appendChild(script)
  }, [])

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry?.location) return

    onSelect({
      address: place.formatted_address ?? '',
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    })
  }, [onSelect])

  // Init autocomplete once script is loaded
  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
    })
    autocompleteRef.current.addListener('place_changed', handlePlaceChanged)
  }, [loaded, handlePlaceChanged])

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      className={className}
    />
  )
}
