import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { todayMondayIso } from "../lib/dates";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: () => ({ name: "planner", params: { weekStart: todayMondayIso() } }),
  },
  {
    path: "/items",
    name: "items",
    component: () => import("../views/ItemsView.vue"),
    meta: { title: "Recipe Book" },
  },
  {
    path: "/planner",
    redirect: () => ({ name: "planner", params: { weekStart: todayMondayIso() } }),
  },
  {
    path: "/planner/:weekStart",
    name: "planner",
    component: () => import("../views/PlannerView.vue"),
    meta: { title: "Weekly Planner" },
    props: true,
  },
  {
    path: "/shopping/:weekStart",
    name: "shopping",
    component: () => import("../views/ShoppingListView.vue"),
    meta: { title: "Shopping List" },
    props: true,
  },
  {
    path: "/print/schedule/:weekStart",
    name: "print-schedule",
    component: () => import("../views/PrintScheduleView.vue"),
    meta: { title: "Weekly Menu", layout: "print" },
    props: true,
  },
  {
    path: "/print/shopping/:weekStart",
    name: "print-shopping",
    component: () => import("../views/PrintShoppingView.vue"),
    meta: { title: "Shopping List", layout: "print" },
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.afterEach((to) => {
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} - Marigolds and Cosmos` : "Marigolds and Cosmos";
});

export default router;
