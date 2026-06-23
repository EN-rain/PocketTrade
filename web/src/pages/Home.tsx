import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { PaginatedListings } from '../lib/types'
import AppShell from '../components/AppShell'
import ListingCard from '../components/ListingCard'
import { useEffect, useRef } from 'react'

const PAGE_SIZE = 12

function fetchListings({ pageParam = 1 }: { pageParam?: number }) {
  return api.get<PaginatedListings>('/listings', {
    params: { page: pageParam, limit: PAGE_SIZE, status: 'active', sort: 'newest' },
  })
}

export default function Home() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, error } =
    useInfiniteQuery({
      queryKey: ['listings', 'feed'],
      queryFn: fetchListings,
      getNextPageParam: (lastPage) => {
        const { page, pages } = lastPage.data
        return page < pages ? page + 1 : undefined
      },
      initialPageParam: 1,
    })

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage) return
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )
    observerRef.current.observe(loadMoreRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const listings = data?.pages.flatMap((p) => p.data.items) ?? []

  return (
    <AppShell>
      <div className="px-4 py-4 md:px-6 md:py-6 max-w-7xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-text-primary mb-4">
          Latest listings
        </h1>

        {status === 'pending' && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-12 text-error">
            <p>Failed to load listings</p>
            <p className="text-sm text-text-muted mt-1">
              {(error as any)?.response?.data?.message || (error as Error).message}
            </p>
          </div>
        )}

        {listings.length === 0 && status === 'success' && (
          <div className="text-center py-12 text-text-secondary">
            <p>No listings yet</p>
            <p className="text-sm text-text-muted mt-1">Be the first to list an item</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        <div ref={loadMoreRef} className="h-8 flex justify-center items-center mt-4">
          {isFetchingNextPage && (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>
    </AppShell>
  )
}
