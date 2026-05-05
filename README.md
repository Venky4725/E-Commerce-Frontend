# Ecommerce Frontend

This is a React frontend for an ecommerce application built with:

- React (functional components with hooks)
- React Router v6
- Axios for API calls
- Tailwind CSS

## Getting Started

1. Install dependencies:
```
npm install
```

2. Start the development server:
```
npm run dev
```

## Features Implemented

- Product listing page (GET /products)
- Product detail page (GET /products/:id)
- Login page (POST /login)
- JWT token storage in localStorage
- Protected route for dashboard
- Search filter on products
- Navigation bar

## Folder Structure

```
ecommerce-frontend/
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    │
    ├── api/
    │   └── api.js
    │
    ├── components/
    │   ├── Navbar.jsx
    │   └── ProductCard.jsx
    │
    ├── pages/
    │   ├── Home.jsx
    │   ├── Login.jsx
    │   ├── ProductDetail.jsx
    │   └── Dashboard.jsx
    │
    └── routes/
        ├── AppRouter.jsx
        └── ProtectedRoute.jsx
```

## Usage Notes

- All components use only useState and useEffect as required
- No Redux or Context API used
- Follows Week 4 curriculum concepts
- Ready to connect to your FastAPI backend