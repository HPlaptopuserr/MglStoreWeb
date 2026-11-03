"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { StockOrderConfirmationDialog } from "./components/StockOrderConfirmationDialog";
import { StockOrderSuccessDialog } from "./components/StockOrderSuccessDialog";
import { StockPaymentDetailDialog } from "./components/StockPaymentDetailDialog";
import { StockPaymentHistory } from "./components/StockPaymentHistory";
import { StockRequestCheckout } from "./components/StockRequestCheckout";
import { StockRequestDetailDialog } from "./components/StockRequestDetailDialog";
import { StockRequestHistory } from "./components/StockRequestHistory";
import { StockRequestWorkflowNav } from "./components/StockRequestWorkflowNav";
import { SupplyWarehouseList } from "./components/SupplyWarehouseList";
import { WarehouseProductCard } from "./components/WarehouseProductCard";
import { WarehouseProductCatalog } from "./components/WarehouseProductCatalog";
import { useStockRequestCart } from "./hooks/useStockRequestCart";
import { useStockRequestData } from "./hooks/useStockRequestData";
import { useStockRequestDocuments } from "./hooks/useStockRequestDocuments";
import { useStockRequestPayments } from "./hooks/useStockRequestPayments";
import { useStockRequestSubmission } from "./hooks/useStockRequestSubmission";
import { useWarehouseCatalog } from "./hooks/useWarehouseCatalog";
import type {
  StockRequestSection,
  StockRequestView,
  WarehouseInventoryItem,
} from "./types/stock-request.types";

export function StockRequestsWorkspace() {
  const data = useStockRequestData();
  const cart = useStockRequestCart();
  const [viewMode, setViewMode] = useState<StockRequestView>("warehouses");
  const documents = useStockRequestDocuments({
    setRequests: data.setRequests,
    setFilteredRequests: data.setFilteredRequests,
  });
  const catalog = useWarehouseCatalog({
    user: data.user,
    warehouses: data.warehouses,
    setCart: cart.setCart,
    viewMode,
    setViewMode,
  });
  const submission = useStockRequestSubmission({
    user: data.user,
    selectedWarehouse: catalog.selectedWarehouse,
    cart: cart.cart,
    deliveryAddress: cart.deliveryAddress,
    deliveryPhone: cart.deliveryPhone,
    note: cart.note,
    refreshStockRequests: data.refreshStockRequests,
    clearCart: cart.clearCart,
    setViewMode,
  });
  const payments = useStockRequestPayments({
    user: data.user,
    refreshStockRequests: data.refreshStockRequests,
    viewMode,
  });

  const outstandingPaymentCount = data.outstandingPayments?.count ?? 0;
  const navigateWorkflow = (section: StockRequestSection) => {
    setViewMode(
      section === "new"
        ? catalog.selectedWarehouse
          ? "browse"
          : "warehouses"
        : section,
    );
  };
  const navigation = (
    <>
      {data.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{data.error}</p>
          {data.user && (
            <button
              type="button"
              onClick={() => void data.refreshStockRequests()}
              className="rounded-lg bg-white px-4 py-2 font-semibold ring-1 ring-red-200 hover:bg-red-100"
            >
              Дахин оролдох
            </button>
          )}
        </div>
      )}
      <StockRequestWorkflowNav
        active={
          viewMode === "requests" || viewMode === "payments" ? viewMode : "new"
        }
        pendingRequestCount={
          data.requests.filter((request) => request.status === "PENDING").length
        }
        outstandingPaymentCount={outstandingPaymentCount}
        onNavigate={navigateWorkflow}
      />
    </>
  );
  const renderProductCard = (
    item: WarehouseInventoryItem,
    isHorizontal = false,
  ) => (
    <WarehouseProductCard
      key={item.id}
      item={item}
      isHorizontal={isHorizontal}
      cartQty={cart.getCartItemQuantity(item.product.id)}
      onAdd={cart.addToCart}
      onQuantityChange={cart.updateCartQuantity}
    />
  );

  if (data.loading) {
    return (
      <div
        className="flex h-96 items-center justify-center"
        role="status"
        aria-label="Бараа таталтын мэдээлэл ачаалж байна"
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#FFAD02]" />
      </div>
    );
  }
  if (viewMode === "warehouses") {
    return (
      <SupplyWarehouseList
        navigation={navigation}
        outstandingPayments={data.outstandingPayments}
        setViewMode={setViewMode}
        user={data.user}
        enterWarehouseById={catalog.enterWarehouseById}
        warehouses={data.warehouses}
        enterWarehouse={catalog.enterWarehouse}
      />
    );
  }
  if (viewMode === "browse" && catalog.selectedWarehouse) {
    return (
      <WarehouseProductCatalog
        {...catalog}
        navigation={navigation}
        outstandingPayments={data.outstandingPayments}
        setViewMode={setViewMode}
        totalCartItems={cart.totalCartItems}
        user={data.user}
        addRecommendationToCart={cart.addRecommendationToCart}
        renderProductCard={renderProductCard}
        cart={cart.cart}
      />
    );
  }
  if (viewMode === "cart") {
    return (
      <StockRequestCheckout
        {...cart}
        setViewMode={setViewMode}
        selectedWarehouse={catalog.selectedWarehouse}
        user={data.user}
        setShowConfirmModal={submission.setShowConfirmModal}
        isSubmitting={submission.isSubmitting}
        confirmationDialog={
          <StockOrderConfirmationDialog
            {...submission}
            totalCartItems={cart.totalCartItems}
          />
        }
        successDialog={
          <StockOrderSuccessDialog
            {...submission}
            totalCartItems={cart.totalCartItems}
          />
        }
      />
    );
  }
  if (viewMode === "payments") {
    return (
      <StockPaymentHistory
        navigation={navigation}
        paymentHistory={payments.paymentHistory}
        loadingPayments={payments.loadingPayments}
        openPaymentDetail={payments.openPaymentDetail}
        paymentDialog={
          <StockPaymentDetailDialog
            {...payments}
            refreshStockRequests={data.refreshStockRequests}
          />
        }
      />
    );
  }
  return (
    <StockRequestHistory
      navigation={navigation}
      requests={data.requests}
      warehouses={data.warehouses}
      filteredRequests={data.filteredRequests}
      setFilteredRequests={data.setFilteredRequests}
      setViewMode={setViewMode}
      setSelectedRequest={documents.setSelectedRequest}
      setShowDetailModal={documents.setShowDetailModal}
      handleCancel={data.handleCancel}
      requestDialog={<StockRequestDetailDialog {...documents} />}
    />
  );
}
