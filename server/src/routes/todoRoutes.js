import { Router } from "express";
import mongoose from "mongoose";
import Todo from "../models/Todo.js";

const router = Router();

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

router.get("/", async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status === "active") filter.completed = false;
    if (status === "completed") filter.completed = true;
    if (search?.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: regex }, { description: regex }];
    }
    const todos = await Todo.find(filter).sort({ createdAt: -1 });
    res.json(todos);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, description = "", priority = "medium", dueDate = null } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
    const todo = await Todo.create({ title, description, priority, dueDate: dueDate || null });
    res.status(201).json(todo);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid todo ID" });
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: "Todo not found" });
    res.json(todo);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid todo ID" });
    const allowed = ["title", "description", "completed", "priority", "dueDate"];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (updates.title !== undefined && !updates.title.trim()) {
      return res.status(400).json({ message: "Title cannot be empty" });
    }
    if (updates.dueDate === "") updates.dueDate = null;
    const todo = await Todo.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true
    });
    if (!todo) return res.status(404).json({ message: "Todo not found" });
    res.json(todo);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/toggle", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid todo ID" });
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: "Todo not found" });
    todo.completed = !todo.completed;
    await todo.save();
    res.json(todo);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid todo ID" });
    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) return res.status(404).json({ message: "Todo not found" });
    res.json({ message: "Todo deleted successfully", id: req.params.id });
  } catch (error) {
    next(error);
  }
});

export default router;
