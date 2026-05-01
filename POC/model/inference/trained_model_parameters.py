# Model location for loading
MODEL_ID_IN_DRIVE = '10npEK72N-EzjP18bDngLy3MVyn6qVSgk'
MODEL_FILE_NAME = 'xray_model_fine_tuning_poc.keras'

# The order of the models during the training
CLASSES = {0: 'Infiltration', 1: 'Effusion', 2: 'Atelectasis'}

# The order of the weights: [Infiltration, Effusion, Atelectasis]
POSITIVE_WEIGHTS_SQRT = [1.9546059, 2.7234676, 2.9298463]
EPSILON = 1e-7

# The order of the thresholds: [Infiltration, Effusion, Atelectasis]
THRESHOLDS_FOR_PREDICTIONS = [0.29, 0.44, 0.34]
