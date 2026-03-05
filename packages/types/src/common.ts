// Common shared base types for MGL Store

/** Primary ID type */
export type ID = string;

/** ISO date string */
export type Timestamp = string;

/** Base entity fields */
export interface BaseEntity {
    id: ID;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

/** Soft delete support */
export interface SoftDelete {
    deletedAt?: Timestamp | null;
}

/** Pagination response */
export interface Pagination {
    page: number;
    limit: number;
    total: number;
}

/** API list response */
export interface PaginatedResponse<T> {
    data: T[];
    pagination: Pagination;
}

/** Geo coordinates */
export interface Coordinates {
    lat: number;
    lng: number;
}

/** Money representation (avoid float issues) */
export type Money = number;

/** Image asset */
export interface Image {
    url: string;
    alt?: string;
}