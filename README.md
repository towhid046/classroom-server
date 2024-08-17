## Server Name: E_shop (server)
### Following are the main APIs of this server:
- All Product API: https://product-store-server-navy.vercel.app/products
- Single Product API: 'https://product-store-server-navy.vercel.app/products/_id' Example: https://product-store-server-navy.vercel.app/products/66bf23cfe756fb7be1aec543
- Get All Brand Names: https://product-store-server-navy.vercel.app/product-brand-names
- Get All Category Names: https://product-store-server-navy.vercel.app/product-category-names
- This API handles Multiple query requests eg.: https://product-store-server-navy.vercel.app/products?currentPage=1&perPageView=8&brand=&category=Mobile&minPrice=1000&maxPrice=1500&sortOrderPrice=&sortOrderDate=
### Packages Used for This Server

- **[cors](https://github.com/expressjs/cors)**: v2.8.5
- **[dotenv](https://github.com/motdotla/dotenv)**: v16.4.5
- **[express](https://github.com/expressjs/express)**: v4.19.2
- **[mongodb](https://github.com/mongodb/node-mongodb-native)**: v6.8.0
