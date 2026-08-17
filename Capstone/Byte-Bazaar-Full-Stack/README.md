# Byte Bazaar

Responsive ecommerce storefront with a React frontend and Spring Boot REST API.

## Run the frontend
```bash
npm install
npm run dev
```

## Run the API
Java 17 and Maven are required.
```bash
cd backend
mvn spring-boot:run
```

API: `GET /api/products`, `GET /api/products/{id}`, `GET /api/products?category=Gaming`, and `POST /api/orders`.

The hosted storefront uses its bundled demo catalog. For production, configure `app/page.tsx` to fetch the deployed API URL and connect a payment provider at checkout.
