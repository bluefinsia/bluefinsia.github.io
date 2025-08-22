let shoppingcart = [
    {name: "t-shirt", price: 20};
    {name: "jeans", price: 50};
    {name: "sneaker", price : 80};
    {name: "backpack", price: 30};
];

function addToCartTotal(item){

    console.log("item added:", item.name);
    console.log("item price:", item.price);
    total = total + item.price;
    console.log("running total:", total);
}

shoppingCart.forEach(addToCartTotal); {
    
});