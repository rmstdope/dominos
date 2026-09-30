import { menu as defaultMenu, type Menu } from "./config/menu";
import { LanguageProvider } from "./i18n/LanguageContext";
import { useOrder } from "./lib/useOrder";
import { NameStep } from "./components/NameStep";
import { ReviewStep } from "./components/ReviewStep";
import { ToppingsStep } from "./components/ToppingsStep";

export default function App({ menu = defaultMenu }: { menu?: Menu }) {
  return (
    <LanguageProvider>
      <Order menu={menu} />
    </LanguageProvider>
  );
}

function Order({ menu }: { menu: Menu }) {
  const order = useOrder(menu);

  switch (order.step) {
    case "name":
      return (
        <NameStep
          initialName={order.customerName}
          initialMakeOwnPizza={order.makeOwnPizza}
          onSubmit={order.submitName}
        />
      );
    case "toppings":
      return (
        <ToppingsStep
          menu={menu}
          customerName={order.customerName}
          isSelected={order.isSelected}
          atLimit={order.atLimit}
          selectedCount={order.selectedIds.length}
          onToggle={order.toggleTopping}
          comment={order.comment}
          onCommentChange={order.setComment}
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
          makeOwnPizza={order.makeOwnPizza}
          toppings={order.selectedToppings}
          comment={order.comment}
          onBack={order.backToToppings}
          onStartOver={order.reset}
        />
      );
  }
}
