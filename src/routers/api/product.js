const router = require('express').Router();
const Product = require('../../models/product');
const storage = require('../../firebase/firebase');
const multer = require('multer');
const auth = require('../../middleware/auth');
const isEmptyObject = require('../../utils/isEmptyObject');
const { body, validationResult } = require('express-validator');

const upload = multer({
    limits: {
        fieldSize: 1000000
    },
    fileFilter(req, file, cb) {
        // Check type file allow jpg, jpeg, png
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            cb(new Error('Please upload a image.'));
        }

        // Confirm file
        cb(undefined, true);
    }
});

router.get('/', async (req, res) => {
    try {
        const products = await Product.find({});
        res.send(products);
    }
    catch (e) {
        cosnole.log(e);
        res.status(500).send('Server is errors.');
    }
});

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findById(id);
        res.send(product);
    }
    catch (e) {

        if (e.kind === 'ObjectId') {
            res.status(404).send('Product is not exists.');
        }

        cosnole.log(e);

        res.status(500).send('Server is errors.');
    }
});

router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const newProduct = req.body;
        const isEmpty = isEmptyObject(newProduct);

        if (isEmpty) {
            res.status(400).send("Product is empty object.");
        }

        const product = new Product(newProduct);
        await product.save();

        if (req.file) {

            //Create a storage ref
            const storageRef = storage.ref(`/${product._id}/${req.file.originalname}`);

            //Upload image
            await storageRef.put(req.file.buffer);

            product.imageUrl = await storageRef.getDownloadURL();

            await product.save();
        }

        res.send(product);
    }
    catch (e) {
        console.log(e);
        res.status(500).send({ msg: e });
    }
});

router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        //Validate a params and body of request.
        const id = req.params.id;
        const productUpdate = req.body;

        if (!id || isEmptyObject(productUpdate)) {
            return res.status(400).send("Please provide id or product.");
        }

        const currentProduct = await Product.findById(id);

        if (!currentProduct) {
            return res.status(404).send("product is not exists.");
        }

        //Validate a object
        const updates = Object.keys(productUpdate);
        const allowUpdates = ['name', 'imageUrl', 'price', 'description', 'manufacturer'
            , 'category', 'conditionProduct', 'quantity'];
        const isValidOperation = updates.every(update => update === 'imageUrl'
            || allowUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).send({ error: "Invalid update !" });
        }

        updates.forEach(update => currentProduct[update] = productUpdate[update]);

        await currentProduct.save();

        // Check image upload
        if (req.file) {
            const prevImageRef = storage.ref(`/${currentProduct._id.toString()}`);

            prevImageRef.listAll().then((res) => {
                res.items.forEach((itemRef) => {
                    itemRef.delete();
                })
            }).catch((e) => {
                console.log('Fail', e);
            });

            //Create a storage ref
            const storageRef = storage.ref(`/${currentProduct._id}/${req.file.originalname}`);

            //Upload image
            await storageRef.put(req.file.buffer);

            currentProduct.imageUrl = await storageRef.getDownloadURL();

            await currentProduct.save();
        }

        return res.send(currentProduct);
    }
    catch (e) {
        console.log(e);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).send("Please provide Id.");
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).send("Product is not exists");
        }

        //Find a folder image and remove
        const prevImageRef = storage.ref(`/${product._id.toString()}`);

        prevImageRef.listAll().then((res) => {
            res.items.forEach((itemRef) => {
                itemRef.delete();
            })
        }).catch((e) => {
            console.log('Fail', e);
        });

        await product.remove();

        res.send({ "result": "remove successfuly", product });
    }
    catch (e) {
        console.log(e);

        if (e.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Product is not exists. ' });
        }

        res.status(500).send('Server is error');
    }
});

// @route Put api/products/like/:id
// @desc Like a product
// @access Private
router.put('/like/:id', auth, async (req, res) => {
    try {
        // Validation params Id
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ msg: 'Product\'\s ID is empty.' });
        }

        // Find a product by Id
        const product = await Product.findById(id);

        // Make sure user is not like product yet.
        const isLiked = product.likes.filter(like => like.user.toString() === req.user.id).length > 0;

        if (isLiked) {
            return res.status(400).json({ msg: 'Product is liked already.' });
        }

        // Push User into Likes array.
        product.likes.unshift({ user: req.user.id });

        await product.save();

        // Response to client
        res.json(product.likes);
    }
    catch (e) {
        console.log(e);

        if (e.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Product is not exists. ' });
        }

        res.status(500).send('Server is errors.');
    }
});

// @route Put api/products/unlike/:id
// @desc Unlike a product
// @access Private
router.put('/unlike/:id', auth, async (req, res) => {
    try {
        // Validation params Id
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ msg: 'Product\'\s ID is empty.' });
        }

        // Find a product by Id
        const product = await Product.findById(id);

        // Make sure user liked product yet.
        const isNotLiked = product.likes.filter(like => like.user.toString() === req.user.id).length === 0;

        if (isNotLiked) {
            return res.status(400).json({ msg: 'Product has not been liked yet.' });
        }

        // Remove index
        const removeIndex = product.likes.map(like => like.user.toString()).indexOf(req.user.id);

        product.likes.splice(removeIndex, 1);

        await product.save();

        // Response to client
        res.json(product.likes);
    }
    catch (e) {
        console.log(e);

        if (e.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Product is not exists. ' });
        }

        res.status(500).send('Server is errors.');
    }
});

// @route Put /api/products/comment/:id
// @desc Comment product.
// @access private
router.put('/comment/:id', [auth,
    [
        body('text', 'text is required.').not().isEmpty()
    ]
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Find a product by id
        const product = await Product.findById(req.params.id);

        const newComment = {
            text: req.body.text,
            name: req.user.name,
            user: req.user.id
        };

        product.comments.push(newComment);

        await product.save();

        res.json(product.comments);
    }
    catch (e) {
        console.log(e);

        if (e.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Product is not exists. ' });
        }

        res.status(500).send('Server is errors.');
    }
});

// @route Delete /api/products/comment/:id/:comment_id
// @desc Delete comment on a product.
// @access private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        // Find comment by id
        const comment = product.comments.find(comment => comment.id === req.params.comment_id);

        if (!comment) {
            return res.status(404).json({ msg: 'Comment is not found' });
        }

        // Check user
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized'});
        }

        // Remove Index
        const removeIndex = product.comments.map(comment => comment.user.toString()).indexOf(req.user.id);

        product.comments.splice(removeIndex, 1);

        await product.save();

        res.json(product.comments);
    }
    catch (e) {
        console.log(e);

        if (e.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Product is not exists. ' });
        }

        res.status(500).send('Server is errors.');
    }
});

module.exports = router;