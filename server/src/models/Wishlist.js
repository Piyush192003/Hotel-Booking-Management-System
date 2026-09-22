import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  },
  { timestamps: true },
);

wishlistSchema.index({ userId: 1, hotelId: 1 }, { unique: true });
wishlistSchema.index({ userId: 1, createdAt: -1 });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);
export default Wishlist;