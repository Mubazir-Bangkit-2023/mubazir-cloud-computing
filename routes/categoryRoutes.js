const express = require("express");
const router = express.Router();
const Category = require("../models/category");
const { v4: uuidv4 } = require("uuid");

router.post("/add", async (req, res) => {
  try {
    const { id, category } = req.body;
    const newCategory = await Category.create({ id, category });
    res.status(201).json({
      message: "Category created successfully",
      category: newCategory,
    });
  } catch (error) {
    console.error("Error creating category", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json({ categories });
  } catch (error) {
    console.error("Error fetching categories", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:categoryId", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ category });
  } catch (error) {
    console.error("Error fetching category", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/:categoryId", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { category } = req.body;
    const updatedCategory = await Category.update(
      { category },
      { where: { id: categoryId } }
    );
    if (updatedCategory[0] === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json({ message: "Category updated successfully" });
  } catch (error) {
    console.error("Error updating category", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:categoryId", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const deletedCategory = await Category.destroy({
      where: { id: categoryId },
    });
    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
