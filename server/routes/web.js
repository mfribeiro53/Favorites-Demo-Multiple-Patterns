import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'Favorites Store Demo' });
});

export default router;
