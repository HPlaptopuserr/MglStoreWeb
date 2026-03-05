export interface ProductCard {
    id: string;

    title: string;
    image: string;

    price: number;
    originalPrice?: number;

    rating?: number;
    reviews?: number;

    tag?: string;

    isPrime?: boolean;
}