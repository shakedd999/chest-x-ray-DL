# X-Ray POC: Training results

This notebook file ***'X_RAY_POC.ipynb'*** contains the data building and the model training for the X-Ray Proof of Concept (POC) project.

---

## How to use the trained model

To perform inference, use the fine-tuned model saved during the final training stage. This file contains the complete architecture, optimizer state, and the best-performing weights.

*   **Model Name**: `xray_model_fine_tuning_poc.keras`
*   **Model Unique Identifier In Drive (for downloading the model)**: `10npEK72N-EzjP18bDngLy3MVyn6qVSgk`
*   **Expected Input Shape**: 224x224x3 (RGB)

Use the next class weights for the loss function: {'Infiltration': 1.9546059, 'Effusion': 2.7234676, 'Atelectasis': 2.9298463}

Use the next thresholds in order to know whether the image contains a chest disease: {'Infiltration': 0.29, 'Effusion': 0.44, 'Atelectasis': 0.34}

---

## Training & Dataset Details

The model in the POC was trained on a filtered subset of the NIH Chest X-ray dataset, specifically targeting high-relevance clinical findings.

### Dataset Distribution
The data was split using a **GroupShuffleSplit** based on **Patient ID** to ensure images from the same patient were not shared between training and testing sets.

| Dataset Set | Image Count | Percentage |
| :--- | :--- | :--- |
| **Training** | 60,974 | 63.6% |
| **Validation** | 15,253 | 15.9% |
| **Test** | 19,604 | 20.5% |
| **Total** | **95,831** | **100%** |

### Target Classes & Label Counts
The model is a multi-label classifier trained to detect the following three conditions:

*   **Infiltration**: 19,894 images
*   **Effusion**: 13,317 images
*   **Atelectasis**: 11,559 images

---

## Preprocessing Pipeline
Before passing an image to the model for a prediction, apply the same preprocessing steps used during training:

1.  **Resize**: Scale the image to **224x224** pixels.
2.  **Color Space**: Convert the image to **RGB** (3 channels).

---

## Quick Start Inference For The Model
To run the inference or reproduce the results from the `X_RAY_POC.ipynb` notebook outside of the original Google Colab environment, you need to install the following dependencies.

Run the following command in your terminal to install all necessary libraries:

```bash
# Core libraries for deep learning and data processing
pip install tensorflow>=2.15.0
pip install numpy>=2.0.0
pip install pandas>=2.1.0
pip install scikit-learn>=1.3.0

# Libraries for image processing and visualization
pip install pillow>=10.0.0
pip install matplotlib>=3.8.0

# Utilities for file downloads and communication
pip install wget==3.2
pip install gdown>=5.1.0
pip install requests
```

And run the next code in order to use the trained model (this is the basic code and can be expanded): 

```python
import tensorflow as tf
import numpy as np
from PIL import Image
import gdown
import os

# 1. Download the model from Google Drive using gdown
url = f'https://drive.google.com/uc?id=10npEK72N-EzjP18bDngLy3MVyn6qVSgk'
model_filename = 'xray_model_fine_tuning_poc.keras'
if not os.path.exists(model_filename):
    print("Downloading model from Google Drive...")
    gdown.download(url, model_filename, quiet=False)

# 2. Load the trained model from the downloaded file
pos_weights_tf = tf.constant([1.9546059, 2.7234676, 2.9298463], dtype=tf.float32) # The class weights for the loss function
def weighted_bce(y_true, y_pred):
    y_pred = tf.clip_by_value(y_pred, 1e-7, 1.0 - 1e-7)
    loss = -(pos_weights_tf * y_true * tf.math.log(y_pred) + (1.0 - y_true) * tf.math.log(1.0 - y_pred))
    return tf.reduce_mean(loss)
model = tf.keras.models.load_model(model_filename, custom_objects={'weighted_bce': weighted_bce})

# 3. Define the image preprocessing pipeline
def preprocess_xray(img_path):
    img = Image.open(img_path).convert("RGB") # Open the image and convert to RGB as required by the model 
    img = img.resize((224, 224)) # Resize the image to 224x224 pixels
    img_array = np.array(img)
    return np.expand_dims(img_array, axis=0) # Add batch dimension (1, 224, 224, 3)

# 4. Perform Prediction
# Ensure the path to your X-ray image is correct
test_image_path = "path_to_your_xray.png"

if os.path.exists(test_image_path):
    processed_img = preprocess_xray(test_image_path)
    predictions = model.predict(processed_img)

    # The model predictions (The possible predictions in the POC are: ['Infiltration', 'Effusion', 'Atelectasis'])
    print(f"Prediction Probabilities: {predictions}")
else:
    print(f"Error: The file '{test_image_path}' was not found.")
```

---

## Training Environment
*   **Hardware**: Trained using a Google Colab **A100 GPU**.
*   **Framework**: TensorFlow / Keras.
*   **Method**: Two-stage transfer learning (Head training followed by Global Fine-Tuning).
*   **Python Version**: python-3.12
