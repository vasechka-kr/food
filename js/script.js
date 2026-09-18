
                                    /* Scan page */

const photoInput = document.getElementById("food-photo");
const preview = document.getElementById("preview-food");
const scanMessage = document.getElementById("scan-message");

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
        scanButton.disabled = true;
        scanButton.textContent = "Scanning...";
        const file = photoInput.files[0];


        const formData = new FormData();
        formData.append("photo", file);

        const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "http://127.0.0.1:8000/scan"
            : "/api/scan";

        try {
            const response = await fetch(API_URL, {
                    method: "POST",
                    body: formData
            });

            if (!response.ok) {
                throw new Error("Backend request failed");
            }

            const data = await response.json();
            const previousScan = localStorage.getItem("partialScan");

            let savedScan = null;

            if (previousScan) {
                scanMessage.textContent = "Some information is still missing. Please take another photo.";
                savedScan = JSON.parse(previousScan);
            }

            if (savedScan) {
                if (savedScan.name === "NOT_FOUND") {
                    savedScan.name = data.name;
                }

                if (savedScan.expirationDate === "NOT_FOUND") {
                    savedScan.expirationDate = data.expirationDate;
                }
    }

            console.log("Backend result:", data);

            const result = savedScan || data;

           if (result.name === "NOT_FOUND" || result.expirationDate === "NOT_FOUND") {

               localStorage.setItem("partialScan", JSON.stringify(result));
                scanMessage.textContent = ("Some information could not be found. Please take another photo.");
                scanButton.textContent = "Scan";
                scanButton.disabled = true;
                return;
            }
            else {
                scanButton.disabled = false;
            }

            localStorage.removeItem("partialScan");
            scanMessage.textContent = "";

            const scanResult = createScanResult(
                result.name,
                result.expirationDate
            );

            localStorage.setItem("scanResult", JSON.stringify(scanResult));
            window.location.href = "result.html";

        } catch (error) {
            console.error("Scan error:", error);
            scanMessage.textContent = "Something went wrong. Please try again.";
            scanButton.disabled = false;
            scanButton.textContent = "Scan";
        }
        });

}


function createScanResult(productName="Unknown product", expirationDate) {
    return {
        name: productName,
        expirationDate: expirationDate
    };
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

        addFoodButton.textContent = "✅ Added to My Food";
        addFoodButton.disabled = true;

        alert(`${food.name} was added to My Food List!`);
    });
}

if (readAloudButton) {
    readAloudButton.addEventListener("click", () => {
        const text = `${food.name}. Expiration date: ${resultDate.textContent}. Status: ${resultStatus.textContent.replace("🔴 ", "").replace("🟡 ", "").replace("🟢 ", "")}`;

        const speech = new SpeechSynthesisUtterance(text);

        speechSynthesis.cancel();
        speechSynthesis.speak(speech);
    });
}



                                    /* My Food List page */

const foodListContainer = document.getElementById("food-list-container");
const manualFoodForm = document.getElementById("manual-food-form");


if (foodListContainer) {


    const savedFood = localStorage.getItem("food");
    if (savedFood) {
        const foodList = JSON.parse(savedFood);

        const today = new Date();

        foodList.sort((a, b) => {

            const aExpired = new Date(a.expirationDate) < today;
            const bExpired = new Date(b.expirationDate) < today;

            if (aExpired && !bExpired) {
                return 1;
            }

            if (!aExpired && bExpired) {
                return -1;
            }
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

if (manualFoodForm) {

    manualFoodForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const name = document.getElementById("manual-food-name").value;
        const expirationDate = document.getElementById("manual-food-date").value;

        const food = {
            name: name,
            expirationDate: expirationDate,
            id: Date.now()
        };

        const savedFood = localStorage.getItem("food");
        let foodList = [];

        if (savedFood) {
            foodList = JSON.parse(savedFood);
        }

        foodList.push(food);
        localStorage.setItem("food", JSON.stringify(foodList));
        location.reload();
    });






}