import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import dotenv from "dotenv";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function getData() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT * FROM staff");
    return rows;
  } finally {
    client.release();
  }
}

// const pool = new Pool({
//   user: process.env.PG_USER,
//   host: process.env.PG_HOST,
//   database: process.env.PG_DATABASE,
//   password: process.env.PG_PASSWORD,
//   port: 5432,
// });

pool
  .connect()
  .then(() => console.log("Connected to the database"))
  .catch((err) => console.error("Database connection error", err));

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `
  type Product {
    id: Int
    name: String
    selling_price: Int
    cost_price: Int
    num_of_stock: Int
    small_category_id: Int
    marchent_id: Int
    small_category: SmallCategory
    big_category: BigCategory
    marchent: Marchent
    attributes: [ProductAttribute]
  }

  type SmallCategory {
    id: Int
    name: String
    big_category_id: Int
  }

  type BigCategory {
    id: Int
    name: String
  }

  type ProductAttribute {
    product_id: Int
    attribute_key_id: Int
    value: String
    attribute_key: AttributeKey
  }

  type AttributeKey {
    id: Int
    name: String
    data_type: String
 }

  type Staff {
    id: Int
    name: String
    role: String
  }

  type Marchent {
    id: Int
    email: String
    phone: String
    address: String
  }

  type Cart {
    id: String
    customer_id: String
    updated_at: String
    cart_items: [CartItem]
  }

  type CartItem {
    id: Int
    cart_id: String
    product_id: Int
    quantity: Int
    product: Product
  }

  type Order {
    id: Int
    customer_name: String
    address: String
    fulfillment_type: FullfillmentType
    status: OrderStatus
    created_at: String
    order_items: [OrderItem]
  }

  type OrderItem {
    id: Int
    order_id: Int
    product_id: Int
    quantity: Int
    product: Product
    price_at_purchase: Int
  }

  enum FullfillmentType {
    PICK_UP
    DELIVERY
  }

  enum OrderStatus {
    PENDING
    COMPLETED
    CANCELLED
  }

  type Query {
    products: [Product]
    staff: [Staff]
    marchents: [Marchent]
    cart(id: String!): Cart
    order(id: Int!): Order
  }

  type Mutation {
    AddProduct(name: String!, selling_price: Int!, cost_price: Int!, num_of_stock: Int!, small_category_id: Int!, marchent_id: Int!): Product
    UpdateStock(product_id: Int!, quantity: Int!): Product

    AddBigCategory(name: String!): BigCategory
    AddSmallCategory(name: String!, big_category_id: Int!): SmallCategory

    AddMarchent(email: String!, phone: String!, address: String!): Marchent
    UpdateMarchent(id: Int!, email: String, phone: String, address: String): Marchent

    AddItemToCart(cart_id: String, customer_id: String, product_id: Int!, quantity: Int!): Cart
    RemoveItemFromCart(cart_id: String!, product_id: Int!): Cart

    PlaceOrder(cart_id: String!, customer_name: String!, address: String!, fulfillment_type: FullfillmentType!): Order
    ChangeOrderStatus(order_id: Int!, status: OrderStatus!): Order
  }
`;

// Resolvers define how to fetch the types defined in your schema.
// This resolver retrieves books from the "books" array above.
const resolvers = {
  Query: {
    products: async () => {
      const result = await pool.query("SELECT * FROM products");
      result.rows.forEach((product) => {
        product.selling_price = parseInt(product.selling_price);
        product.cost_price = parseInt(product.cost_price);
        product.num_of_stock = parseInt(product.num_of_stock);
      });
      return result.rows;
    },
    staff: async () => {
      const result = await pool.query("SELECT * FROM staff");
      return result.rows;
    },
    marchents: async () => {
      const result = await pool.query("SELECT * FROM marchents");
      return result.rows;
    },
    cart: async (_, args) => {
      const result = await pool.query("SELECT * FROM carts WHERE id = $1", [
        args.id,
      ]);
      return result.rows[0];
    },
    order: async (_, args) => {
      const result = await pool.query("SELECT * FROM orders WHERE id = $1", [
        args.id,
      ]);
      return result.rows[0];
    },
  },
  Product: {
    small_category: async (parent) => {
      const result = await pool.query(
        "SELECT * FROM small_categories WHERE id = $1",
        [parent.small_category_id]
      );
      return result.rows[0];
    },
    big_category: async (parent) => {
      const result = await pool.query(
        "SELECT bc.* FROM big_categories bc JOIN small_categories sc ON bc.id = sc.big_category_id WHERE sc.id = $1",
        [parent.small_category_id]
      );
      return result.rows[0];
    },
    marchent: async (parent) => {
      const result = await pool.query("SELECT * FROM marchents WHERE id = $1", [
        parent.marchent_id,
      ]);
      return result.rows[0];
    },
    attributes: async (parent) => {
      const result = await pool.query(
        "SELECT * FROM product_attributes WHERE product_id = $1",
        [parent.id]
      );
      return result.rows;
    },
  },
  ProductAttribute: {
    attribute_key: async (parent) => {
      const result = await pool.query(
        "SELECT * FROM attributes_keys WHERE id = $1",
        [parent.attribute_key_id]
      );
      return result.rows[0];
    },
  },
  // This is a resolver for the Cart type to fetch its cart_items
  // ie. quantity
  Cart: {
    cart_items: async (parent) => {
      const result = await pool.query(
        "SELECT * FROM cart_items WHERE cart_id = $1",
        [parent.id]
      );
      return result.rows;
    },
  },
  // This is a resolver for the CartItem type to fetch its product details
  // ie. product information (Product)
  CartItem: {
    product: async (parent) => {
      const result = await pool.query("SELECT * FROM products WHERE id = $1", [
        parent.product_id,
      ]);
      return result.rows[0];
    },
  },
  Order: {
    order_items: async (parent) => {
      const result = await pool.query(
        "SELECT * FROM order_items WHERE order_id = $1",
        [parent.id]
      );
      return result.rows;
    },
  },
  OrderItem: {
    product: async (parent) => {
      const result = await pool.query("SELECT * FROM products WHERE id = $1", [
        parent.product_id,
      ]);
      return result.rows[0];
    },
  },
  Mutation: {
    AddProduct: async (_, args) => {
      const result = await pool.query(
        "INSERT INTO products (name, selling_price, cost_price, num_of_stock, small_category_id, marchent_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [
          args.name,
          args.selling_price,
          args.cost_price,
          args.num_of_stock,
          args.small_category_id,
          args.marchent_id,
        ]
      );
      return result.rows[0];
    },
    UpdateStock: async (_, args, context) => {
      // Check if user is authenticated and has manager role
      if (!context.user) {
        throw new Error("Authentication required");
      }
      if (context.user.role !== "Manager") {
        throw new Error("Only managers can add stock");
      }

      const result = await pool.query(
        "UPDATE products SET num_of_stock = num_of_stock + $1 WHERE id = $2 RETURNING *",
        [args.quantity, args.product_id]
      );
      return result.rows[0];
    },
    AddBigCategory: async (_, args) => {
      const result = await pool.query(
        "INSERT INTO big_categories (name) VALUES ($1) RETURNING *",
        [args.name]
      );
      return result.rows[0];
    },
    AddSmallCategory: async (_, args) => {
      const result = await pool.query(
        "INSERT INTO small_categories (name, big_category_id) VALUES ($1, $2) RETURNING *",
        [args.name, args.big_category_id]
      );
      return result.rows[0];
    },
    AddMarchent: async (_, args) => {
      const result = await pool.query(
        "INSERT INTO marchents (email, phone, address) VALUES ($1, $2, $3) RETURNING *",
        [args.email, args.phone, args.address]
      );
      return result.rows[0];
    },
    UpdateMarchent: async (_, args) => {
      const result = await pool.query(
        "UPDATE marchents SET email = COALESCE($1, email), phone = COALESCE($2, phone), address = COALESCE($3, address) WHERE id = $4 RETURNING *",
        [args.email, args.phone, args.address, args.id]
      );
      return result.rows[0];
    },
    AddItemToCart: async (_, args) => {
      let cartId = args.cart_id;

      // If no cart_id provided, create a new cart
      if (!cartId) {
        const newCart = await pool.query(
          "INSERT INTO carts (id, customer_id, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *",
          [uuidv4(), args.customer_id]
        );
        cartId = newCart.rows[0].id;
      }

      // Check if item already exists in cart
      const existing = await pool.query(
        "SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2",
        [cartId, args.product_id]
      );

      if (existing.rows.length > 0) {
        // Update existing item quantity (add to existing)
        await pool.query(
          "UPDATE cart_items SET quantity = quantity + $1 WHERE cart_id = $2 AND product_id = $3",
          [args.quantity, cartId, args.product_id]
        );
      } else {
        // Insert new item
        await pool.query(
          "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)",
          [cartId, args.product_id, args.quantity]
        );
      }

      // Update cart timestamp
      await pool.query(
        "UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [cartId]
      );

      // Return the updated cart
      const cart = await pool.query("SELECT * FROM carts WHERE id = $1", [
        cartId,
      ]);
      return cart.rows[0];
    },
    RemoveItemFromCart: async (_, args) => {
      await pool.query(
        "DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2",
        [args.cart_id, args.product_id]
      );

      // Update cart timestamp
      await pool.query(
        "UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [args.cart_id]
      );

      // Return the updated cart
      const cart = await pool.query("SELECT * FROM carts WHERE id = $1", [
        args.cart_id,
      ]);
      return cart.rows[0];
    },
    PlaceOrder: async (_, args) => {
      // Fetch cart items
      const cartItems = await pool.query(
        "SELECT * FROM cart_items WHERE cart_id = $1",
        [args.cart_id]
      );
      const items = cartItems.rows;

      if (items.length === 0) {
        throw new Error("Cart is empty");
      }

      // Validate stock availability for all items
      for (const item of items) {
        const productResult = await pool.query(
          "SELECT num_of_stock, name FROM products WHERE id = $1",
          [item.product_id]
        );
        const product = productResult.rows[0];

        if (product.num_of_stock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.num_of_stock}, Requested: ${item.quantity}`
          );
        }
      }

      // Create order
      const orderResult = await pool.query(
        "INSERT INTO orders (customer_name, address, fulfillment_type, status, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *",
        [args.customer_name, args.address, args.fulfillment_type, "PENDING"]
      );
      const orderId = orderResult.rows[0].id;

      // Create order items and reduce stock
      for (const item of items) {
        // Fetch product price
        const productResult = await pool.query(
          "SELECT selling_price FROM products WHERE id = $1",
          [item.product_id]
        );
        const priceAtPurchase = productResult.rows[0].selling_price;

        // Insert order item
        await pool.query(
          "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)",
          [orderId, item.product_id, item.quantity, priceAtPurchase]
        );

        // Reduce stock
        await pool.query(
          "UPDATE products SET num_of_stock = num_of_stock - $1 WHERE id = $2",
          [item.quantity, item.product_id]
        );
      }

      // Clear cart items
      await pool.query("DELETE FROM cart_items WHERE cart_id = $1", [
        args.cart_id,
      ]);

      return orderResult.rows[0];
    },
    ChangeOrderStatus: async (_, args) => {
      const result = await pool.query(
        "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
        [args.status, args.order_id]
      );
      return result.rows[0];
    },
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({
      embed: true,
      includeCookies: true,
    }),
  ],
});

// Initialize server
let serverStarted = false;

// Export handler for Vercel
export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Start server once
  if (!serverStarted) {
    await server.start();
    serverStarted = true;
  }

  // Handle landing page for browser visits
  if (req.method === "GET" && !req.query?.query) {
    const landingHTML = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚀</text></svg>" />
          <title>Grocery Store GraphQL</title>
        </head>
        <body style="margin: 0; overflow: hidden;">
          <div id="embedded-sandbox"></div>
          <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>
          <script>
            new window.EmbeddedSandbox({
              target: '#embedded-sandbox',
              initialEndpoint: 'https://${
                req.headers.host || "localhost:4000"
              }',
              includeCookies: true,
            });
          </script>
        </body>
      </html>
    `;
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(landingHTML);
    return;
  }

  try {
    let query, variables, operationName;

    // Parse GraphQL request
    if (req.method === "GET") {
      query = req.query?.query;
      variables = req.query?.variables
        ? JSON.parse(req.query.variables)
        : undefined;
      operationName = req.query?.operationName;
    } else if (req.body) {
      query = req.body.query;
      variables = req.body.variables;
      operationName = req.body.operationName;
    }

    // Get auth context
    const authHeader = req.headers.authorization || "";
    const staffId = authHeader.replace("Bearer ", "");

    let user = null;
    if (staffId) {
      const result = await pool.query("SELECT * FROM staff WHERE id = $1", [
        staffId,
      ]);
      user = result.rows[0];
    }

    // Execute GraphQL operation
    const result = await server.executeOperation(
      { query, variables, operationName },
      { contextValue: { user } }
    );

    // Send response
    res.setHeader("Content-Type", "application/json");
    if (result.body.kind === "single") {
      res.status(200).json(result.body.singleResult);
    } else {
      res
        .status(200)
        .json({ errors: [{ message: "Incremental delivery not supported" }] });
    }
  } catch (error) {
    console.error("GraphQL Error:", error);
    res.status(500).json({
      errors: [
        {
          message:
            error instanceof Error ? error.message : "Internal server error",
        },
      ],
    });
  }
}
