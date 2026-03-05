export type ID = string;

export type ISODateString = string;

export type DecimalString = string;

export interface Timestamps {
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface SoftDeletable {
    deletedAt?: ISODateString | null;
}