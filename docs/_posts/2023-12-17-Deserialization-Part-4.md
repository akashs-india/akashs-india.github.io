---
title: "Deserialization Vulnerabilities in .Net - Part 4"
sub_title: "A deep dive"
excerpt: Understanding solutions to secure your services against deserialization vulnerabilities.
categories:
  - Security
elements:
  - content
  - css
  - formatting
  - html
  - markup
last_modified_at: 2023-12-17T10:16:49-05:00
---

**Note:** Prior to proceeding further, it is highly advisable to familiarize yourself with [Part 1](https://akashs-india.github.io/docs/security/Deserialization-Part-1/ "Part 1"), [Part 2](https://akashs-india.github.io/docs/security/Deserialization-Part-2/ "Part 2") and [Part 3](https://akashs-india.github.io/docs/security/Deserialization-Part-3/ "Part 3"). The preceding parts have provided in-depth insights into the intricacies of serialization and deserialization processes, shedding light on the vulnerabilities intertwined with these operations.

In this part, our focus shifts towards exploring approaches to secure our services against deserialization vulnerabilities.

## Identifying the Main Factor Behind Deserialization Vulnerabilities

A primary contributor to deserialization vulnerabilities arises when "**The type to be deserialized is controlled by user input.**" For instance, in the case of the binary formatter, the type of the object to be deserialized is determined from the serialized payload sent by the client.

## Solutions to Mitigate Deserialization Attacks

### Eliminate Serialization and Deserialization

While it may seem trivial, some companies targeted by deserialization attacks realized they didn't need to use serialization for certain data transport scenarios. If the objective is simply passing a string from a client to a server, bypassing serialization and deserialization may be a viable option. However, this solution is context-dependent and may not apply universally.

### Use a binder during serialization and deserialization

As discussed in [Part 2](https://akashs-india.github.io/docs/security/Deserialization-Part-2/ "Part 2"), many serializers/deserializers offer the ability to integrate custom binders into the serialization/deserialization process. In the example code below, an instance of the `BlockListBinder` class is employed as a binder in the binary formatter for deserialization. The `BindToType` function in the binder can prevent the instantiation of known vulnerable types.

<b>Note:</b> Zoom into images for clarity

![Using a binder (with binary formatter) to implement a blocked list of type to not deserialize](/images/DeserializationPart4_Fig1.png)

Once the `formatter.Deserialize` is called, internally the binary formatter reads the name of the assembly and the types to be instantiated from the serialized payload. Before it instantiates the type, it first looks at performing type resolution using the assembly name and type name it read from the serialized payload in string form. In case we are using a binder, the binary formatter code would call the `BindToType` function that we have defined. In our implementation of the `BindToType` function, we throw if the type to be instantiated is one of the know vulnerable types that we have put into our `BlockedTypes` list. This prevents the deserialization of a known vulnerable type.

The issue with the above approach is that new vulnerable types continue to be found, making it difficult to maintain a comprehensive and up-to-date block list. The alternate approach is to use an allowed list of types that we expect the binary formatter to deserialize in our service. In this approach, though, care needs to be taken to include all the expected deserialization types and their member types in the allowed list of types. If not done this could lead to failure of genuine deserialization scenarios.

From personal experience, large systems have several serialization and deserialization requirements spread across the product/service. In several instances there are custom deserialization flows implemented which could potentially allow circumventing your binder based protections. Its due to this reason that I feel the binder based approach is more like bandaging your service, where use of a secure serializer/deserializer could be a more complete approach from security standpoint.

### Signing serialized data

Signing the serialized data,and validating its signature before deserialization is another protective measure to prevent deserialization of untrusted malicious data.
This approach requires a mechanism to securely share signing key information among trusted parties serializing and deserializing the payload. For instance, for communication between 2 servers that we own, a shared certificate with a private key can be utilized for signing and signature verification of the serialized payload.

![Signing serialization data](/images/DeserializationPart4_Fig2.png)

### Using secure deserializers

Usage of secure deserializers which do not rely on the passed input to determine the type of the object to be instantiated is a great way to improve protection of your services against deserialization attacks. Various secure deserializers include protobuf, json.net (with typeNameHandling set to none), etc.

With this, we conclude our blog series. Hopefully, this series has provided valuable insights into serialization/deserialization, associated vulnerabilities, and potential remediation strategies.

![Signing serialization data](/images/ThatsAllFolks.png)