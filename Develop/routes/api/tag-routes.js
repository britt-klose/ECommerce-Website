const router = require('express').Router();
const { Tag, Product, ProductTag } = require('../../models');

// The `/api/tags` endpoint
// find all tags
  // be sure to include its associated Product data
router.get('/', async (req, res) => {
  try {
    const tagData = await Tag.findAll();
    res.status(200).json(tagData);
  } catch (err) {
    res.status(500).json(err);
  }
});

 // find a single tag by its `id`
  // be sure to include its associated Product data
router.get('/:id', async (req, res) => {
  try {
    const tagData = await Tag.findByPk(req.params.id, {
      include: [{model: Product, through: ProductTag, as: 'product-tags'}]
    });
    if (!tagData) {
      res.status(404).json({message: 'No tag found with this id'});
      return;
    }
    res.status(200).json(tagData);
  }catch (err) {
    res.status(500).json(err);
  }
});

// create a new tag
router.post('/', (req, res) => {
  Tag.create(req.body)
    .then((tag) => {
      //if there's product tags we need to make pairings to bulk create in the ProductTag model
      if (req.body.productIds.length) {
        const productTagIdArr = req.body.productIds.map((product_id) => {
          return {
            tag_id: tag.id,
            product_id,
          };
        });
        return ProductTag.bulkCreate(productTagIdArr);
      }
      //if no product tags, respond
      res.status(200).json(tag);
    })
    .then((productTagIds) => res.status(200).json(productTagIds))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

 // update a tag's name by its `id` value
router.put('/:id', (req, res) => {
 Tag.update(req.body, {
   where: {
     id: req.params.id,
   },
 })
 .then((tag) => {
   return ProductTag.findAll({where: {tag_id: req.params.id} });
 })
 .then((productTags) => {
   const productTagsIds = productTags.map(({product_id}) => product_id);
   const newProductTags = req.body.productIds
   .filter((product_id) => !productTagsIds.includes(product_id))
   .map((product_id) => {
     return{
       tag_id: req.params.id,
       product_id,
     };
   });
   //which ones should be removed?
   const productTagsToRemove = productTags
   .filter(({product_id}) => !req.body.productIds.includes(product_id))
   .map(({id}) => id);
   return Promise.all([
     ProductTag.destory({ where: {id: productTagsToRemove }}),
     ProductTag.bulkCreate(newProductTags),
   ]);
 })
 .then((updatedProductTags) => res.json(updatedProductTags))
 .catch((err) => {
   res.status(400).json(err);
 });
});

 // delete on tag by its `id` value
router.delete('/:id', async (req, res) => {
 try {
   const tagData = await Tag.destroy({
     where: {
       id: req.params.id
     }
   });
   if (!tagData) {
     res.status(404).json({message: 'No tag found with this id'});
     return;
   }
   res.status(200).json(tagData);
 } catch(err) {
   res.status(500).json(err);
 }
});

module.exports = router;
