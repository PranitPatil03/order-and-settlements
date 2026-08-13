export type LineItemInput = {
  description: string;
  quantity: number;
  unitPriceCents: number;
};

export type CalculatedLineItem = LineItemInput & {
  lineTotalCents: number;
};

export const calculateOrderTotals = (lineItems: LineItemInput[]) => {
  const calculatedLineItems: CalculatedLineItem[] = lineItems.map((lineItem) => ({
    ...lineItem,
    lineTotalCents: lineItem.quantity * lineItem.unitPriceCents,
  }));

  const subtotalCents = calculatedLineItems.reduce(
    (total, lineItem) => total + lineItem.lineTotalCents,
    0,
  );

  return {
    lineItems: calculatedLineItems,
    subtotalCents,
    totalCents: subtotalCents,
  };
};
