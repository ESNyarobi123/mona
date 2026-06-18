"use client";

import { DeliveryPricingAdmin } from "../../../../../components/admin/DeliveryPricingAdmin";

export default function RestaurantDeliveryPage() {
  return (
    <DeliveryPricingAdmin
      module="RESTAURANT"
      titleKey="deliveryPricingRestaurant"
      leadKey="deliveryPricingRestaurantLead"
    />
  );
}
