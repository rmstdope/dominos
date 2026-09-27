import { menu as defaultMenu, type Menu } from "./config/menu";
import { useOrder } from "./lib/useOrder";
import { NameStep } from "./components/NameStep";
import { ReviewStep } from "./components/ReviewStep";
import { ToppingsStep } from "./components/ToppingsStep";

export default function App({ menu = defaultMenu }: { menu?: Menu }) {
  const order = useOrder(menu);

  switch (order.step) {
    case "name":
      return <NameStep initialName={order.customerName} onSubmit={order.submitName} />;
    case "toppings":
      return (
        <ToppingsStep
          menu={menu}
          customerName={order.customerName}
          isSelected={order.isSelected}
          atLimit={order.atLimit}
          selectedCount={order.selectedIds.length}
          onToggle={order.toggleTopping}
          onClear={order.clearToppings}
          onBack={order.backToName}
          onContinue={order.goToReview}
        />
      );
    case "review":
      return (
        <ReviewStep
          menu={menu}
          customerName={order.customerName}
          toppings={order.selectedToppings}
          onBack={order.backToToppings}
          onStartOver={order.reset}
        />
      );
  }
}
