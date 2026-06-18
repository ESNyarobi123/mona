"use client";

import { DeliveryPricingAdmin } from "../../../../../components/admin/DeliveryPricingAdmin";

export default function GroceryDeliveryPage() {
  return (
    <DeliveryPricingAdmin
      module="GROCERY"
      titleKey="deliveryPricingGrocery"
      leadKey="deliveryPricingGroceryLead"
    />
  );
}
