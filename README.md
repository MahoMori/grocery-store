# 🛒 Grocery Store GraphQL API

A full-stack GraphQL API built to learn **GraphQL** and **SQL** database design. This project simulates a grocery store management system with product catalogs, shopping carts, order processing, and merchant management.

## 📚 Purpose

This project was created as a learning exercise to:

- Gain hands-on experience with **GraphQL** schema design and resolvers
- Practice **SQL** database modeling and complex queries with PostgreSQL
- Understand the relationship between GraphQL types and relational database tables

## 🚀 Tech Stack

- **GraphQL** - Apollo Server for API implementation
- **PostgreSQL** - Relational database for data persistence
- **TypeScript** - Type-safe development
- **Node.js + Express** - Server runtime and middleware

## ✨ Features

### Core Functionality

- **Product Management**: CRUD operations for products with categories and attributes
- **Category System**: Hierarchical categorization (Big Categories → Small Categories)
- **Shopping Cart**: Add/remove items, persistent cart management
- **Order Processing**: Place orders with pickup/delivery options
- **Merchant Management**: Track merchant information and their products
- **Staff Management**: Staff directory queries

### GraphQL Operations

#### Queries

- `products` - Retrieve all products with nested category and merchant data
- `cart(id)` - Get cart with items and product details
- `order(id)` - Fetch order information with items
- `staff` - List all staff members
- `marchents` - List all merchants

#### Mutations

- Product operations: `AddProduct`, `UpdateStock`
- Category management: `AddBigCategory`, `AddSmallCategory`
- Merchant operations: `AddMarchent`, `UpdateMarchent`
- Cart operations: `AddItemToCart`, `RemoveItemFromCart`
- Order management: `PlaceOrder`, `ChangeOrderStatus`

## 🗄️ Database Schema

The PostgreSQL database includes the following key tables:

- `products` - Product inventory with pricing and stock
- `big_category` / `small_category` - Hierarchical product categorization
- `product_attributes` - Flexible product attributes system
- `marchents` - Merchant/vendor information
- `carts` / `cart_items` - Shopping cart management
- `orders` / `order_items` - Order tracking and history
- `staff` - Staff directory

The database diagram can be viewed [here](https://dbdiagram.io/d/Grocery-Store-Management-System-6931e830d6676488baa636d2).

## 🚀 Demo on Apollo Studio

You can test GraphQL operations on Apollo Studio Sandbox:

```
https://studio.apollographql.com/sandbox/explorer?endpoint=https://grocery-store-virid.vercel.app
```
