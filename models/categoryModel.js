const { db } = require('../config/db');

const CategoryModel = {
  async listAll() {
    return db.any(`
      SELECT c.id, c.name, c.description, c.created_at,
             COUNT(cr.id) AS creations_count
      FROM categories c
      LEFT JOIN creations cr ON cr.category = c.name
      GROUP BY c.id, c.name, c.description, c.created_at
      ORDER BY c.name ASC
    `);
  },

  async getById(id) {
    return db.oneOrNone('SELECT * FROM categories WHERE id = $1', [id]);
  },

  async getByName(name) {
    return db.oneOrNone('SELECT * FROM categories WHERE LOWER(name) = LOWER($1)', [name]);
  },

  async create(name, description = '') {
    return db.one(
      `INSERT INTO categories (name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [name.trim(), description.trim()]
    );
  },

  async update(id, name, description = '') {
    return db.tx(async t => {
      const oldCat = await t.oneOrNone('SELECT name FROM categories WHERE id = $1', [id]);
      if (!oldCat) return null;

      const updated = await t.one(
        `UPDATE categories
         SET name = $1, description = $2
         WHERE id = $3
         RETURNING *`,
        [name.trim(), description.trim(), id]
      );

      // Re-link existing creations if name changed
      if (oldCat.name !== name.trim()) {
        await t.none('UPDATE creations SET category = $1 WHERE category = $2', [name.trim(), oldCat.name]);
        await t.none('UPDATE challenges SET category = $1 WHERE category = $2', [name.trim(), oldCat.name]);
      }

      return updated;
    });
  },

  async delete(id) {
    return db.tx(async t => {
      const cat = await t.oneOrNone('SELECT name FROM categories WHERE id = $1', [id]);
      if (!cat) return null;

      // Reassign associated creations and challenges to 'Other' if deleting
      await t.none('UPDATE creations SET category = $1 WHERE category = $2', ['Other', cat.name]);
      await t.none('UPDATE challenges SET category = $1 WHERE category = $2', ['Other', cat.name]);
      await t.none('DELETE FROM categories WHERE id = $1', [id]);

      return cat;
    });
  }
};

module.exports = CategoryModel;
