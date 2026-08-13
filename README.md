# 🛵 DelivriLi — Digital Menu & Delivery Platform

DelivriLi is a comprehensive Digital Menu and Real-Time Delivery Progressive Web App (PWA) built for restaurants. It offers a complete end-to-end ecosystem for customers, restaurant staff, and couriers, featuring live GPS tracking, geofenced deliveries, and resilient state management.

## 🌟 Key Features

### 🛍️ Customer Experience
- **Interactive Digital Menu:** Browse menus, customize items, and place orders seamlessly.
- **Live Order Tracking:** Real-time map tracking with live updates.
- **Dynamic Routing:** View the actual driving route (Trajet) the courier is taking, powered by Open Source Routing Machine (OSRM).
- **Customer Geolocation:** Customers can see their own live GPS position on the tracking map relative to the courier.
- **Order Status Timeline:** Step-by-step progress from Kitchen to Doorstep.
- **Review System:** Rate deliveries upon completion.

### 🏪 Restaurant Admin Dashboard
- **Kanban-style Board:** Manage orders across different states (`Pending`, `Preparing`, `Ready`).
- **Real-Time Sync:** Instant updates when customers order or couriers update delivery status.
- **Performance Metrics:** Track urgent orders, wait times, and daily revenue.

### 🚀 Courier App (PWA)
- **Smart Dispatch:** Real-time job alerts with audio/visual popups.
- **Interactive Delivery Flow:** Step-by-step actions (`Pick Up` ➔ `Arrive` ➔ `Mark Delivered`).
- **Delivery Geofencing:** Couriers must be within **250 meters** of the customer's location to unlock the "Mark Delivered" button.
- **Background Location Tracking:** Broadcasts live GPS coordinates directly to the customer's tracking page.
- **Offline Resilience:** Polling and LocalStorage integration ensures the app works seamlessly even if network connectivity drops temporarily.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (React)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database & Realtime:** [Supabase](https://supabase.com/)
- **Maps & Routing:** [Leaflet.js](https://leafletjs.com/) & [OSRM API](http://project-osrm.org/)
- **State Management:** React Hooks + LocalStorage syncing
- **Icons:** [Lucide React](https://lucide.dev/)

---

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Supabase account and project

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/zeriouil/DelivriLi.git
   cd DelivriLi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🏗️ Project Structure

- `/src/app/` - Main Next.js App Router pages (Customer view, Admin Dashboard, Courier App).
- `/src/components/` - Reusable React components grouped by feature (`admin/`, `courier/`, `customer/`).
- `/src/lib/` - Utilities and database connection configurations (Supabase).
- `/src/types/` - TypeScript definitions and data models.

---

## 🗺️ How Live Tracking Works

1. **Courier Broadcasts:** When a courier accepts a job, the app uses `navigator.geolocation.watchPosition` to broadcast their live GPS coordinates.
2. **Customer Polling:** The tracking page receives the coordinates in real-time.
3. **OSRM Routing:** The map requests a live route from the Courier's GPS to the Customer's Address (or live GPS).
4. **Geofence Enforcement:** The courier's "Hand Over" button remains locked (🔒) until the Haversine distance formula confirms they are within 250m of the destination.

---

## 📄 License

This project is licensed under the MIT License.
