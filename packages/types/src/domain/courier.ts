import type { User, Profile } from "./user";
import type { Delivery } from "./order";
import type { Capability } from "../enums/role";
import type { ID, ISODateString } from "../primitives";

export type Courier = User & { capability: Capability.DELIVERY_DRIVER };

export interface CourierWithProfile {
    user: Courier;
    profile?: Profile | null;
}

export interface CourierDashboardStats {
    courierId: ID;
    activeDeliveries: number;
    completedToday: number;
    lastSeenAt?: ISODateString | null;
}

export interface CourierDeliveryView extends Delivery {
    courier?: CourierWithProfile | null;
}