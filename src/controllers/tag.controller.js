const Tag = require("../models/tag");
const Habit = require("../models/habit");

// POST /tags 
exports.createTag = async (req, res) => {
  try {
    const { name, color } = req.body;

    const exists = await Tag.findOne({
      user: req.user.id,
      name: name.trim()
    });

    if (exists) {
      return res.status(400).json({ message: "Tag already exists" });
    }

    const tag = await Tag.create({
      name: name.trim(),
      color,
      user: req.user.id
    });

    res.status(201).json(tag);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};


// GET /tags
exports.getTags = async (req, res) => {
  try {
    const tags = await Tag.find({ user: req.user.id });
    res.json(tags);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /habits/:habitId/tags/:tagId
exports.assignTagToHabit = async (req, res) => {
  try {
    const { habitId, tagId } = req.params;
    
    const habit = await Habit.findOneAndUpdate(
      { _id: habitId, user: req.user.id },
      { $addToSet: { tags: tagId } },
      { new: true }
    ).populate('tags');
    if (!habit) return res.status(404).json({ message: "habit not found" });
    res.json(habit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};