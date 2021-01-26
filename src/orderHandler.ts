import { ContainerSpec, OrderRequest, ShipmentRecord } from "./interfaces";
import {ContainerBatch, CratePacker} from "./crateAllocator"

export class OrderHandler {
  constructor(private parameters: { containerSpecs: ContainerSpec[] }) {}

  packOrder(orderRequest: OrderRequest): ShipmentRecord {
    let allocator: CratePacker;
    let containers: ContainerBatch[];
    let total_packaging_vol: number;

    const dummyObject: ShipmentRecord = {
      orderId: "",
      totalVolume: {
        unit: "cubic " + this.parameters.containerSpecs[0].dimensions.unit,
        value: 0,
      },
      containers: [],
    };

    allocator = new CratePacker(this.parameters.containerSpecs, orderRequest.products);

    containers = allocator.pack();
    total_packaging_vol = allocator.get_total_packaging_volume(containers);

    if (containers) {
      dummyObject.orderId = orderRequest.id;
      dummyObject.totalVolume.value = total_packaging_vol;
      dummyObject.containers = containers;

    } else {
      throw new Error("No packaging allocated for the order!");
    }
    return dummyObject
  }
}
