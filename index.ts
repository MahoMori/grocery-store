import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import dotenv from "dotenv";
import { get } from "http";
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_TEST,
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

  type Query {
    products: [Product]
    staff: [Staff]
    marchents: [Marchent]
    cart(id: String!): Cart
  }

  type Mutation {
    AddProduct(name: String!, selling_price: Int!, cost_price: Int!, num_of_stock: Int!, small_category_id: Int!, marchent_id: Int!): Product
    UpdateStock(product_id: Int!, quantity: Int!): Product

    AddBigCategory(name: String!): BigCategory
    AddSmallCategory(name: String!, big_category_id: Int!): SmallCategory

    AddMarchent(email: String!, phone: String!, address: String!): Marchent
    UpdateMarchent(id: Int!, email: String, phone: String, address: String): Marchent

    AddItemToCart(cart_id: String!, product_id: Int!, quantity: Int!): Cart
    RemoveItemFromCart(cart_id: String!, product_id: Int!): Cart
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
      // Check if item already exists in cart
      const existing = await pool.query(
        "SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2",
        [args.cart_id, args.product_id]
      );

      if (existing.rows.length > 0) {
        // Update existing item quantity (add to existing)
        await pool.query(
          "UPDATE cart_items SET quantity = quantity + $1 WHERE cart_id = $2 AND product_id = $3",
          [args.quantity, args.cart_id, args.product_id]
        );
      } else {
        // Insert new item
        await pool.query(
          "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)",
          [args.cart_id, args.product_id, args.quantity]
        );
      }

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
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Passing an ApolloServer instance to the `startStandaloneServer` function:
//  1. creates an Express app
//  2. installs your ApolloServer instance as middleware
//  3. prepares your app to handle incoming requests
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    // Get the user ID from the authorization header (e.g., "Bearer <staff_id>")
    const authHeader = req.headers.authorization || "";
    const staffId = authHeader.replace("Bearer ", "");

    if (staffId) {
      // Fetch user from database
      const result = await pool.query("SELECT * FROM staff WHERE id = $1", [
        staffId,
      ]);
      return { user: result.rows[0] };
    }

    return { user: null };
  },
});

console.log(`🚀  Server ready at: ${url}`);
