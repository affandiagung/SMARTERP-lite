# SmartERP Lite - Portfolio Project

SmartERP Lite is a Next.js-based ERP portfolio project built to demonstrate practical full-stack development in an ERP business context. The project focuses on procurement, inventory, goods receipt, sales, reporting, authentication, and responsive operational UI.

I built this project as a targeted portfolio for a Next.js Developer opportunity, with the goal of showing relevant implementation skills beyond a generic dashboard or CRUD application.

## Project Summary

SmartERP Lite is a lightweight ERP prototype for small and medium businesses. It helps users manage products, suppliers, purchase orders, goods receipts, stock movements, sales orders, and operational reports in one integrated workflow.

The project is designed around realistic ERP logic:

- Products are master data, not direct stock editors.
- Stock is calculated from movement history.
- Goods receipt is linked to purchase orders.
- Purchase orders can be partially or fully received.
- Inventory value uses weighted average cost.
- Sales orders validate stock availability.
- Sales status moves forward in a controlled workflow.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- Supabase PostgreSQL
- Supabase Auth
- Recharts
- Vercel deployment

## Core Features

### Authentication and Roles

- Supabase Auth email/password login
- Admin and viewer roles
- Admin can manage master data and transactions
- Viewer can access dashboard and reports only
- Server actions are protected with admin authorization checks

### Product Management

- Add product master data
- Manage SKU, category, unit, reorder level, default cost, and selling price
- Edit reorder level per product
- Filter products by category and status
- Sort products by category, status priority, and inventory value
- Product status is calculated automatically:
  - Reorder: stock is at or below reorder level
  - Watch: stock is near reorder level
  - Healthy: stock is above the watch threshold

### Supplier Management

- Add supplier records
- Store supplier name, contact person, and email
- Suppliers are used when creating purchase orders

### Purchase Orders

- Create purchase orders linked to suppliers and products
- Expected date must be at least one day after PO creation
- Purchase orders can be clicked to view detail
- PO detail includes supplier, creation date, expected date, status, product line, ordered quantity, received quantity, remaining quantity, and unit cost
- PO status updates automatically:
  - Ordered
  - Partially Received
  - Received

### Goods Receipt

- Receive goods against open purchase order lines
- Receipt quantity cannot exceed remaining PO quantity
- Receipt unit cost is inherited from the PO line and cannot be edited during receipt
- Partial receipt is supported
- Fully received PO lines are no longer available for receipt
- Goods receipts create positive stock movements
- Receipt records can be clicked to view detail

### Inventory Ledger and Valuation

- Stock is calculated from stock movements, not manually edited product fields
- Stock movements include opening stock, purchase receipt, sales shipment, and adjustment types
- Each movement stores quantity and unit cost
- Inventory value uses weighted average cost logic
- Example:

```text
Opening stock: 10 units x $10 = $100
New receipt:   10 units x $12 = $120

Total stock: 20 units
Inventory value: $220
Average cost: $11
```

### Sales Orders

- Create sales orders with customer, product, quantity, and unit price
- Unit price defaults from product selling price
- Sales order validates available stock
- Sales shipment creates negative stock movement
- Sales status moves forward only:
  - Confirmed
  - Packed
  - Shipped
- Shipped orders are locked and cannot move backward

### Dashboard

- Inventory value summary
- Open purchase order exposure
- Sales summary
- Reorder alerts
- Stock movement chart
- Inventory value by category
- Inventory control table
- Workflow integrity panel
- Supplier overview panel

### Reports

- Inventory report
- Purchase report
- Sales report
- Stock ledger report
- Inventory value and movement data are based on stock movement records

### Responsive UI

- Desktop sidebar navigation
- Mobile menu navigation
- Responsive dashboard layout
- Wide tables scroll horizontally inside their cards on smaller screens
- Mobile layout avoids full-page horizontal overflow

## ERP Workflow

The main workflow is:

```text
Product and Supplier setup
        ↓
Create Purchase Order
        ↓
Receive Goods against PO
        ↓
Post Stock Movement
        ↓
Create Sales Order
        ↓
Validate Stock
        ↓
Post Sales Shipment
        ↓
Review Dashboard and Reports
```

## Architecture Notes

The application uses Next.js App Router with server components for database fetching and client components for interactive UI.

Prisma is used as the ORM layer for Supabase PostgreSQL. Server Actions handle mutations such as creating products, suppliers, purchase orders, goods receipts, and sales orders.

Authentication is handled by Supabase Auth. User role information is stored in a `UserProfile` table and used to control admin/viewer access.

The inventory model is based on a stock movement ledger. This avoids manually editing stock quantities and makes stock reports more auditable.

## Database Models

Main models include:

- UserProfile
- Product
- Supplier
- PurchaseOrder
- PurchaseOrderLine
- SalesOrder
- SalesOrderLine
- StockMovement

## Why This Project Matters

This project was created to demonstrate the ability to build a domain-aware business application with Next.js. It focuses on real workflow behavior rather than only visual components.

The project shows experience with:

- Full-stack Next.js development
- Database modeling
- Authentication and role-based access
- Server-side validation
- ERP workflow design
- Inventory movement logic
- Weighted average inventory valuation
- Responsive dashboard UI
- Deployment-ready architecture

## Current Limitations

This is a portfolio prototype, not a production ERP system. Some areas that could be improved in a production version include:

- More detailed audit logging
- Multi-warehouse support
- Stock reservation for sales orders
- Customer management
- Invoice and payment modules
- Purchase order approval workflow
- Server-side pagination for large reports
- More complete role and permission management
- Automated tests for business workflows

## Suggested Demo Flow

When presenting the project, the recommended walkthrough is:

1. Login as admin
2. Open dashboard and explain the KPI cards
3. Open Product Management and explain reorder level, status, average cost, and inventory value
4. Create a purchase order
5. Open Goods Receipt and receive part of the PO quantity
6. Show how the PO status becomes Partially Received
7. Receive the remaining quantity and show the PO status becomes Received
8. Create a sales order
9. Move sales status from Confirmed to Packed to Shipped
10. Open Reports and show the stock ledger

## Demo Links

Live Demo:

```text
https://smarterp-lite-gamma.vercel.app/
```

GitHub Repository:

```text
https://github.com/affandiagung/SMARTERP-lite
```

## Demo Accounts

Admin:

```text
admin@smarterp.test
admin123
```

Viewer:

```text
viewer@smarterp.test
viewer123
```

## Short Portfolio Description

SmartERP Lite is a full-stack Next.js ERP prototype built with TypeScript, Prisma, Supabase, and Tailwind CSS. It demonstrates product and supplier management, purchase orders, PO-linked goods receipt, inventory stock ledger, weighted average cost valuation, sales order workflow, role-based authentication, dashboard metrics, reports, and responsive UI.
