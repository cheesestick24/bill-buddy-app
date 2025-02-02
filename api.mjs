import express from 'express';
import { insertRoundingOption } from './database'; // Assuming you have a database module

const router = express.Router();

router.post('/calculate', (req, res) => {
    const { totalAmount, splitRatio, roundingOption } = req.body;
    const myShare = (totalAmount * (splitRatio / 100)).toFixed(2);
    const theirShare = (totalAmount * ((100 - splitRatio) / 100)).toFixed(2);

    const applyRounding = (amount) => {
        let roundedAmount;
        if (roundingOption === '四捨五入') {
            roundedAmount = Math.round(amount / 100) * 100;
        } else if (roundingOption === '相手が多め') {
            roundedAmount = Math.ceil(amount / 100) * 100;
        } else {
            roundedAmount = Math.floor(amount / 100) * 100;
        }
        return roundedAmount;
    };

    // Insert roundingOption into the database
    insertRoundingOption(roundingOption);

    res.json({
        myShare: applyRounding(myShare),
        theirShare: applyRounding(theirShare)
    });
});

export default router;
