import express from 'express';

const router = express.Router();

router.post('/calculate', (req, res) => {
    const { totalAmount, splitRatio, roundingOption } = req.body;
    const myShare = (totalAmount * (splitRatio / 100)).toFixed(2);
    const theirShare = (totalAmount * ((100 - splitRatio) / 100)).toFixed(2);

    const applyRounding = (amount) => {
        let roundedAmount;
        if (roundingOption === 'even') {
            roundedAmount = Math.round(amount / 100) * 100;
        } else if (roundingOption === 'more') {
            roundedAmount = Math.ceil(amount / 100) * 100;
        } else {
            roundedAmount = Math.floor(amount / 100) * 100;
        }
        return roundedAmount;
    };

    res.json({
        myShare: applyRounding(myShare),
        theirShare: applyRounding(theirShare)
    });
});

export default router;
