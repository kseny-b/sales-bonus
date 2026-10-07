/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   const { discount, sale_price, quantity } = purchase;
   const discountFactor = 1 - (purchase.discount / 100);
   return sale_price * quantity * discountFactor;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    let bonus = 0;
    if (index === 0) {
        bonus = 0.15;
    } else if (index === 1 || index === 2) {
        bonus = 0.1;
    } else if (index === total - 1) {
        bonus = 0;
    } else {
        bonus = 0.05;
    }

    return profit * bonus;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    const { calculateRevenue, calculateBonus } = options;
    if (!data
        || !data.customers
        || !data.products
        || !data.sellers
        || !data.purchase_records
        || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Некорректная функция расчёта данных');
    }

    if (!calculateRevenue || !calculateBonus) {
    throw new Error('Чего-то не хватает');
    }

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        first_name: seller.first_name,
        last_name: seller.last_name,
        start_date: seller.start_date,
        position: seller.position,
        sales_count: 0,
        revenue: 0,
        profit: 0,
        products_sold: {}
    }));

    const sellerIndex = Object.fromEntries(sellerStats.map(seller => [seller.id, seller]));
    const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product]));

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count++;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            const profit = revenue - cost;

            seller.revenue = Math.round((seller.revenue + revenue) * 100) / 100;
            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });
    
    sellerStats.sort((a, b) => b.profit - a.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold)
        .map(([sku, quantity]) => ({
            sku,
            quantity
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    });

    return sellerStats.map(seller => ({
    seller_id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products.map(product => ({
        sku: product.sku,
        quantity: product.quantity
    })),
    bonus: +seller.bonus.toFixed(2)
    }));
}