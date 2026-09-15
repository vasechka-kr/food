
                                    /* Scan page */

const photoInput = document.getElementById("food-photo");
const preview = document.getElementById("preview-food");

const scanButton = document.getElementById("scan-button");

if (photoInput){

    photoInput.addEventListener("change", () => {
        const file = photoInput.files[0];

        if (file) {
            preview.src = URL.createObjectURL(file);
            scanButton.disabled = false;
        }
    });
}

if (scanButton) {

    scanButton.addEventListener("click", async() => {
        const file = photoInput.files[0];



        const formData = new FormData();
        formData.append("photo", file);

        fetch("http://127.0.0.1:8000/scan", {
            method: "POST",
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                console.log("OCR:  ");
                console.log(data.text);
            });

        console.log("OCR started");

        const text = await getOCRText(file);

        console.log("OCR finished");
        console.log(text);

        const fileName = file.name.split('.')[0];

        const expirationDate = extractExpirationDate(text);

        if (!expirationDate) {
            alert("Expiration date not found");
            return;
        }

        const scanResult = createScanResult("Unknown product", expirationDate);

        localStorage.setItem("scanResult", JSON.stringify(scanResult));
        // window.location.href = "result.html";
    });
}


function createScanResult(productName="Unknown product", expirationDate) {
    return {
        name: productName,
        expirationDate: expirationDate
    };
}


function prepareImage(file) {
    return new Promise((resolve) => {
        const image = new Image();

        image.onload = () => {
            const scale = 3;

            const canvas = document.createElement("canvas");
            canvas.width = image.width * scale;
            canvas.height = image.height * scale;

            const ctx = canvas.getContext("2d");

            ctx.drawImage(
                image,
                0,
                0,
                canvas.width,
                canvas.height
            );

            const imageData = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );

            for (let i = 0; i < imageData.data.length; i += 4) {
                imageData.data[i] =
                    Math.min(255, imageData.data[i] * 1.3);

                imageData.data[i + 1] =
                    Math.min(255, imageData.data[i + 1] * 1.3);

                imageData.data[i + 2] =
                    Math.min(255, imageData.data[i + 2] * 1.3);
            }

            ctx.putImageData(imageData, 0, 0);

            resolve(canvas);
        };

        image.src = URL.createObjectURL(file);
    });
}



async function getOCRText (file) {

    const image = await prepareImage(file);

    console.log("Image size:", image.width, "x", image.height);

    const result = await Tesseract.recognize(
        image,
        "eng"
    );

    return result.data.text;




}


function extractExpirationDate(text) {
    const dates = text.match(/\d{1,2}[/.-]\d{1,2}[-./]\d{2,4}/g);
    const isoDate = text.match(/\d{4}-\d{2}-\d{2}/);

    if (!dates && isoDate) {
        return isoDate[0]
    }

    if (!dates) {
        return null;
    }

    dates.forEach((date, index) => {
        let [day, month, year] = date.split(/[./-]/);
        if (year.length === 2) {
            year = `20${year}`;
    }
        dates[index] = `${day}.${month}.${year}`;
    })


    dates.sort((a, b) => {
        return new Date(b.split(/[./-]/).reverse().join("-")) - new Date(a.split(/[./-]/).reverse().join("-"));
    })

    let [day, month, year] = dates[0].split(/[./-]/);


    const formatDate = `${year}-${month}-${day}`;
    // const testDate = new Date(formatDate);
    // if (isNaN(testDate)) {
    //     return null
    // }

    return formatDate;
}




function getStatus(expirationDate) {
    const today = new Date();
    const expiration = new Date(expirationDate);

     const difference = expiration - today;
     const leftDays = Math.floor(difference / (3600 * 1000 * 24));



     if (today > expiration) {
         return "🔴 Expired";
     }
     else if (leftDays <= 3) {
         return "🟡 Expiring soon!";
     }
     else {
         return "🟢 Fresh";
     }

  }


                                    /* Result page */

const addFoodButton = document.getElementById("add-food");
const readAloudButton = document.getElementById("read-aloud");

const resultProduct = document.getElementById("result-product");
const resultDate = document.getElementById("result-date");
const resultStatus = document.getElementById("result-status");

const savedScan = localStorage.getItem("scanResult");
const food = JSON.parse(savedScan);  // typeof = object


if (resultProduct) {
    resultProduct.textContent = food.name;

    const expirationDate = new Date(food.expirationDate);
    const formatDate = expirationDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });

    resultDate.textContent = formatDate;
    resultStatus.textContent = getStatus(food.expirationDate);

}


if (addFoodButton) {
    addFoodButton.addEventListener("click", () => {

        const savedFood = localStorage.getItem("food");

        let foodList = [];

        if (savedFood) {
            foodList = JSON.parse(savedFood);  // typeof = object
        }


        food.id = Date.now()
        foodList.push(food);

        localStorage.setItem("food", JSON.stringify(foodList));  // update "food" in localStorage with foodlist

        alert(`${food.name} was added to My Food List!`);
    });
}

if (readAloudButton) {
    readAloudButton.addEventListener("click", () => {
        const text = `${food.name}. Expiration date: ${resultDate.textContent}. Status: ${resultStatus.textContent}`;

        const speech = new SpeechSynthesisUtterance(text);

        speechSynthesis.cancel();
        speechSynthesis.speak(speech);
    });
}





                                    /* My Food List page */

const foodListContainer = document.getElementById("food-list-container");


if (foodListContainer) {


    const savedFood = localStorage.getItem("food");
    if (savedFood) {
        const foodList = JSON.parse(savedFood);

        foodList.sort((a, b) => {
            return new Date(a.expirationDate) - new Date(b.expirationDate);
        });



        foodList.forEach((food) => {

            const expirationDate = new Date(food.expirationDate);

            const formatDate = expirationDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });



            const status = getStatus(food.expirationDate);

            foodListContainer.innerHTML += `
        <div class="food-card">
            <h2>${food.name}</h2>
            <p>Expiration Date: ${formatDate}</p>
            <p>Status: ${status}</p>
            <button class="remove-button" data-id="${food.id}">Remove</button>
        </div>
        `;
        });


        const removeButton = document.querySelectorAll(".remove-button");
    removeButton.forEach((button) => {
        button.addEventListener("click", () => {
            const foodId = Number(button.dataset.id);

            const foodIndex = foodList.findIndex((food) => food.id === foodId);
            foodList.splice(foodIndex, 1);
            localStorage.setItem("food", JSON.stringify(foodList));
            location.reload();
            });
        });

    }

    else {
        foodListContainer.textContent = "Your food list is empty. Scan a product to add it!"

    }
    
}

fetch("http://127.0.0.1:8000/food", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        name: "Milk"
    })
})
    .then(response => response.json())
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error(error);
    });