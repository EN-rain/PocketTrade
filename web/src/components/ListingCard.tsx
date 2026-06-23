import { Link } from 'react-router-dom'
import type { Listing } from '../lib/types'
import HeartIcon from './icons/HeartIcon'
import LocationIcon from './icons/LocationIcon'

interface ListingCardProps {
  listing: Listing
  onToggleFavorite?: (id: number) => void
}

export default function ListingCard({ listing, onToggleFavorite }: ListingCardProps) {
  const imageUrl = listing.images?.[0]?.url

  return (
    <Link to={`/listing/${listing.id}`} className="block group">
      <div className="bg-surface rounded-xl border border-card-border overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-out">
        <div className="aspect-square relative bg-surface-high">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${listing.brand} ${listing.model}`}
              className="w-full h-full object-cover group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <span className="text-sm">No image</span>
            </div>
          )}
          {listing.status === 'sold' && (
            <span className="absolute top-2 left-2 bg-foreground/80 text-white text-xs font-medium px-2 py-1 rounded-lg">
              Sold
            </span>
          )}
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onToggleFavorite(listing.id)
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white transition-all duration-200 active:scale-90"
            >
              <HeartIcon
                filled={listing.isFavourite}
                className={`w-5 h-5 ${listing.isFavourite ? 'text-error' : 'text-text-muted'}`}
              />
            </button>
          )}
        </div>
        <div className="p-3 space-y-1">
          <p className="font-semibold text-text-primary line-clamp-1">
            {listing.brand} {listing.model}
          </p>
          <p className="text-sm font-bold text-primary">
            ${listing.price.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="bg-surface-high px-2 py-0.5 rounded-md">{listing.condition}</span>
            {listing.location && (
              <span className="flex items-center gap-0.5">
                <LocationIcon className="w-3 h-3" />
                {listing.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
