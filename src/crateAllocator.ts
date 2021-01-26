export class CratePrototype {
    private readonly size: number[];
    private volume: number;
    items: number[][];
    spaces: number[][];

    constructor(x:number, y:number, z:number) {
        this.size = [x, y, z];
        this.volume = x*y*z;
        this.spaces = [this.size];
        this.items = [];
    }

    add_item(item: number[]): boolean {

        // packs a given item into the first suitable free space
        // of the container and allocates leftover free space snippets which are reused

        let allocated = false;
        let oriented_obj = item.sort();
        let idx: any;
        let oriented_space: any;

        for (idx in this.spaces) {
            oriented_space = this.spaces[idx].sort();

            if (oriented_space[0] >= oriented_obj[0] &&
                oriented_space[1] >= oriented_obj[1] &&
                oriented_space[2] >= oriented_obj[2]) {

                this.items.push(oriented_obj);
                let new_spaces = this.allocate_spaces(oriented_obj, oriented_space);
                this.spaces.splice(idx, 1);
                if (new_spaces) {
                    this.spaces = this.spaces.concat(new_spaces);
                }
                allocated = true;
                break

            }
        }

        return allocated;
    }

    allocate_spaces(item:number[], space:number[]) {

        // allocates new free space snippets based on the size of a fitted item

        let adjacent_spaces = [];

        if (space[0] - item[0] > 0) {
            adjacent_spaces.push([space[0] - item[0], space[1], item[2]]);
        }

        if (space[1] - item[1] > 0) {
            adjacent_spaces.push([item[0], space[1] - item[1], item[2]]);
        }

        if (space[2] - item[2] > 0) {
            adjacent_spaces.push([space[0], space[1], space[2] - item[2]]);
        }

        return adjacent_spaces
    }
}

export interface ContainerBatch {
    containerType: string;
    containingProducts: Array<{
        id: string;
        quantity: number;
    }>;
}

export class CratePacker {
    crate_types: any;
    containers: any;
    packing_queue: any;

    constructor(crate_specs: any, order_items: any) {
        this.containers = [];
        this.crate_types = crate_specs;
        this.packing_queue = order_items;
    }

    get_volume(item:any){
        return item.dimensions.length
            * item.dimensions.width
            * item.dimensions.height
    }

    get_size_array(item: any) {
        return [item.dimensions.length, item.dimensions.width, item.dimensions.height]
    }

    check_if_fits(object: any, packaging: any) {

        // we can sort dimensional values for the convenience of comparison,
        // reallocating values in arrays is basically object rotation irl

        let object_dimensions = this.get_size_array(object).sort();
        let packaging_dimensions = this.get_size_array(packaging).sort();

        return (object_dimensions[0] <= packaging_dimensions[0] &&
                object_dimensions[1] <= packaging_dimensions[1] &&
                object_dimensions[2] <= packaging_dimensions[2])
    }

    get_container_batch(packaging_type: string, itemId: string, quantity: number): ContainerBatch {
        return {containerType: packaging_type,
            containingProducts: [
                {
                    id: itemId,
                    quantity: quantity,
                }
            ]
        }
    }

    pack(): ContainerBatch[] {

        // while packing queue is not empty finds the best fitting container option
        // for a product batch, allocates a sufficient number of containers of that type
        // and adds the container batch object to the master list

        let current_item;
        let chosen_crate_type;
        let crate_size_arr;
        let current_crate;
        let crate_stack;

        let q: number;
        let placed: boolean;
        let idx;

        while (this.packing_queue.length > 0) {
            current_item = this.packing_queue.splice(0, 1)[0];
            crate_stack = [];

            chosen_crate_type = this.find_best_fit(current_item);
            crate_size_arr = this.get_size_array(chosen_crate_type);

            current_crate = new CratePrototype(crate_size_arr[0],
                crate_size_arr[1],
                crate_size_arr[2]);

            for (q = current_item.orderedQuantity; q > 0; q--) {
                placed = current_crate.add_item(this.get_size_array(current_item));

                if (!placed) {
                    crate_stack.push(current_crate);
                    q++;
                    current_crate = new CratePrototype(crate_size_arr[0],
                        crate_size_arr[1],
                        crate_size_arr[2]);
                }
            }

            crate_stack.push(current_crate);

            for (idx in crate_stack) {
                this.containers.push(
                    this.get_container_batch(chosen_crate_type.containerType,
                        current_item.id,
                        crate_stack[idx].items.length))
                }
            }
        return this.containers
    }

    find_best_fit(item: any) {

        // vol_remainder stores empty space volume remainder as in case of ideal malleable items,
        // we won't treat objects as such, it is just used for approximate calculation of the tightest fit

        let single_item_volume = this.get_volume(item);
        let vol_remainder = null;
        let best_fit = null;
        let crate_idx: any;
        let crate_volume: any;

        for (crate_idx in this.crate_types) {

            crate_volume = this.get_volume(this.crate_types[crate_idx]);

            if (this.check_if_fits(item, this.crate_types[crate_idx])) {
                if (vol_remainder == null || vol_remainder > crate_volume % single_item_volume) {
                    best_fit = this.crate_types[crate_idx];
                    vol_remainder = crate_volume % single_item_volume;
                }

                if (this.check_perfect_fit(item, this.crate_types[crate_idx])) {
                    return this.crate_types[crate_idx]
                }
            }
        }
        if (best_fit == null) {
            throw new Error("No fitting containers were found.")
        } else {
            return best_fit
        }

    }

    check_perfect_fit(object: any, packaging: any) {

        // checks if the container type can be filled with select item
        // entirely without leftover space

        let object_dimensions = this.get_size_array(object).sort();
        let packaging_dimensions = this.get_size_array(packaging).sort();

        return (packaging_dimensions[0] % object_dimensions[0] == 0 &&
            packaging_dimensions[1] % object_dimensions[1] == 0 &&
            packaging_dimensions[2] % object_dimensions[2] == 0)
    }

    get_total_packaging_volume(containers:any) {
        let idx;
        let type_idx;
        let total = 0;

        for (idx in containers) {
            for (type_idx in this.crate_types) {
                if (containers[idx].containerType == this.crate_types[type_idx].containerType) {
                    total += this.get_volume(this.crate_types[type_idx]);
                }
            }
        }
        return total;
    }
}
